'use client'
import { TabelaDePrecosComGrid } from "../components/tableprecos";
import { 
  Box, 
  Button, 
  Grid, 
  GridItem, 
  VStack, 
  Heading, 
  Text,
  Skeleton,
  Center
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { db } from "./firebaseConfig";
import { collection, getDocs, query, where } from "firebase/firestore";
import { FloatingChat } from "../components/FloatingChat"; 

export default function Home() {


  
  // Estados para os dados
  const [operadoras, setOperadoras] = useState([]);
  const [tabelaSelecionadaData, setTabelaSelecionadaData] = useState(null);
  
  // Estados de carregamento
  const [isOperadorasLoading, setIsOperadorasLoading] = useState(true);
  const [isTabelaLoading, setIsTabelaLoading] = useState(false);

  // Estados para seleção do usuário
  const [selecionada, setSelecionada] = useState(null);
  const [planoSelecionado, setPlanoSelecionado] = useState(null);

  // Efeito 1: Busca a lista de operadoras
  useEffect(() => {
    const fetchOperadoras = async () => {
      setIsOperadorasLoading(true);
      try {
        const response = await fetch('/api/operadoras');
        if (!response.ok) throw new Error('Falha na rede');
        const operadorasData = await response.json();
        
        console.log("Operadoras buscadas com sucesso:", operadorasData);
        
        setOperadoras(operadorasData);
        
        if (operadorasData.length > 0) {
          setSelecionada(operadorasData[0].value);
        } else {
          console.warn("Nenhuma operadora encontrada.");
        }

      } catch (error) {
        console.error("FALHA AO BUSCAR DADOS DO FIREBASE:", error);
      
      } finally {
        setIsOperadorasLoading(false);
      }
    };
    fetchOperadoras();
  }, []);

  // Efeito 2: Busca os dados da tabela quando 'selecionada' muda
  useEffect(() => {
    if (!selecionada || operadoras.length === 0) return;

    const fetchTabelaData = async () => {
      setIsTabelaLoading(true);
      setPlanoSelecionado(null);
      
      const operadoraAtual = operadoras.find(op => op.value === selecionada);
      if (!operadoraAtual) {
        setIsTabelaLoading(false);
        return;
      }

      // const tabelasRef = collection(db, "planos_saude_extraidos");
      // const q = query(tabelasRef, where("empresa", "==", operadoraAtual.label));
      
      try {
        const response = await fetch(`/api/${operadoraAtual.value}`);
            if (!response.ok) throw new Error('Falha na rede');
            const data = await response.json();

        setTabelaSelecionadaData(data);

        } catch (error) {
            console.error("Erro ao buscar dados da tabela na API:", error);
            setTabelaSelecionadaData(null);
        } finally {
            setIsTabelaLoading(false);
        }
    };
    
    fetchTabelaData();
  }, [selecionada, operadoras]);

  const planosDisponiveis = tabelaSelecionadaData?.planos || [];
  const detalhesDoPlano = planoSelecionado 
    ? planosDisponiveis.find(p => p.produto === planoSelecionado)
    : null;

  // --- COMPONENTES SKELETON ---
  const SkeletonMenu = () => (
    <VStack spacing={2} align="stretch" w="100%">
      <Skeleton height="20px" w="80%" mb={4} />
      <Skeleton height="40px" />
      <Skeleton height="40px" />
      <Skeleton height="40px" />
      <Skeleton height="40px" />
    </VStack>
  );

  const SkeletonDetalhes = () => (
    <VStack align="stretch" spacing={4}>
      <Skeleton height="36px" w="60%" />
      <Skeleton height="20px" w="40%" mb={6} />
      <Skeleton height="300px" />
    </VStack>
  );

  // Se estiver carregando a lista inicial de operadoras, mostra esqueleto em tudo
  if (isOperadorasLoading) {
    return (
      <Box>
        <Grid templateColumns="repeat(4, 1fr)" gap={6} minH="100vh">
          <GridItem colSpan={1} bg="gray.900" p={4}><SkeletonMenu /></GridItem>
          <GridItem colSpan={1} p={4}><SkeletonMenu /></GridItem>
          <GridItem colSpan={2} p={4}><SkeletonDetalhes /></GridItem>
        </Grid>
      </Box>
    );
  }

  return (
    <Box>
      <Grid templateColumns="repeat(4, 1fr)" gap={6} minH="100vh">
        {/* COLUNA 1: OPERADORAS */}
        <GridItem colSpan={1} bg="gray.900" p={4}>
          <VStack spacing={2} align="stretch" w="100%">
            <Heading size="sm" mb={4} color="gray.400">Tabelas importadas</Heading>
            {operadoras.map((item) => (
              <Button
                key={item.value}
                onClick={() => setSelecionada(item.value)}
                colorScheme="blue"
                variant={selecionada === item.value ? "solid" : "ghost"}
                justifyContent="flex-start"
              >
                {item.label}
              </Button>
            ))}
          </VStack>
        </GridItem>
        
        {/* COLUNA 2: PLANOS */}
        <GridItem colSpan={1} p={4}>
          {isTabelaLoading ? (
            <SkeletonMenu />
          ) : (
            <VStack spacing={2} align="stretch" w="100%">
              <Heading size="sm" mb={4} color="gray.400">
                Planos de {tabelaSelecionadaData?.empresa || '...'}
              </Heading>
              {planosDisponiveis.map((plano) => (
                <Button
                  key={plano.produto}
                  onClick={() => setPlanoSelecionado(plano.produto)}
                  colorScheme="green"
                  variant={planoSelecionado === plano.produto ? "solid" : "ghost"}
                  justifyContent="flex-start"
                >
                  {plano.produto}
                </Button>
              ))}
            </VStack>
          )}
        </GridItem>
        
        {/* COLUNA 3: DETALHES */}
        <GridItem colSpan={2} p={4}>
          {isTabelaLoading ? (
            <SkeletonDetalhes />
          ) : detalhesDoPlano ? (
            (() => {
              // Lógica de Ordenação dos Preços
              const precosObjeto = 
                detalhesDoPlano.acomodacao_preco.nenhum?.[0] || 
                detalhesDoPlano.acomodacao_preco.enfermaria?.[0] || 
                detalhesDoPlano.acomodacao_preco.apartamento?.[0];

              let precosOrdenados = {};

              if (precosObjeto) {
                const arrayDePrecosOrdenado = Object.entries(precosObjeto).sort((a, b) => {
                  const idadeA = parseInt(a[0], 10);
                  const idadeB = parseInt(b[0], 10);
                  return idadeA - idadeB;
                });
                precosOrdenados = Object.fromEntries(arrayDePrecosOrdenado);
              }
              
              return (
                <Box>
                  <Heading size="lg">{detalhesDoPlano.produto}</Heading>
                  <Text color="gray.400" mb={6}>Acomodação: {detalhesDoPlano.acomodacao}</Text>
                  
                  <TabelaDePrecosComGrid precosIniciais={precosOrdenados} />
                </Box>
              );
            })()
          ) : (
            <Center h="100%">
              <Text color="gray.500">Selecione um plano para ver os detalhes</Text>
            </Center>
          )}
        </GridItem>
      </Grid>
      
      {/* ✅ CORREÇÃO: Adiciona o componente do chat flutuante para que seja renderizado */}
      <FloatingChat />
    </Box>
  );
}