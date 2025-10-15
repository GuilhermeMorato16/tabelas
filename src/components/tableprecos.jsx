// Arquivo: src/components/tableprecos.jsx

// 1. A importação de "@chakra-ui/icons" foi REMOVIDA.
import { Box, Grid, Text, Button, Heading, Input, HStack } from "@chakra-ui/react";
import { useState, useEffect } from "react";

// O componente agora recebe 'precosIniciais' como uma prop
export function TabelaDePrecosComGrid({ precosIniciais }) {
  const [precos, setPrecos] = useState(precosIniciais || {});
  
  useEffect(() => {
    setPrecos(precosIniciais || {});
  }, [precosIniciais]);

  const [editingFaixa, setEditingFaixa] = useState(null);
  const [currentValue, setCurrentValue] = useState("");

  const handleEdit = (faixa, valor) => {
    setEditingFaixa(faixa);
    setCurrentValue(valor);
  };

  const handleCancel = () => {
    setEditingFaixa(null);
  };

  const handleSave = (faixaParaSalvar) => {
    const novosPrecos = { ...precos, [faixaParaSalvar]: currentValue };
    setPrecos(novosPrecos);
    setEditingFaixa(null);
  };

  if (Object.keys(precos).length === 0) {
    return <Text color="gray.500">Dados de preço não disponíveis.</Text>;
  }

  return (
    <Box p={6} borderWidth="1px" borderRadius="lg">
      <Grid templateColumns="3fr 2fr 1fr" gap={6} mb={4}>
        <Heading size="sm" color="gray.400">Faixa etária</Heading>
        <Heading size="sm" color="gray.400">Valor (R$)</Heading>
        <Box />
      </Grid>
      

      <Grid templateColumns="3fr 2fr 1fr" gap={6} alignItems="center">
        {Object.entries(precos).map(([faixa, valor]) => (
          editingFaixa === faixa ? (
            // MODO DE EDIÇÃO com botões de texto
            <>
              <Text fontSize="md">{faixa}</Text>
              <Input 
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                size="sm"
              />
              <HStack justifySelf="flex-end">
                <Button
                  aria-label="Salvar valor"
                  colorScheme="green"
                  size="sm"
                  onClick={() => handleSave(faixa)}
                >
                  Salvar
                </Button>
                <Button
                  aria-label="Cancelar edição"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                >
                  X
                </Button>
              </HStack>
            </>
          ) : (
            // MODO DE VISUALIZAÇÃO com botão de texto
            <>
              <Text fontSize="md">{faixa}</Text>
              <Text fontSize="md">{valor}</Text>
              <Button
                aria-label={`Editar valor para a faixa ${faixa}`}
                variant="link"
                colorScheme="blue"
                justifySelf="flex-end"
                onClick={() => handleEdit(faixa, valor)}
              >
                Editar
              </Button>
            </>
          )
        ))}
      </Grid>
    </Box>
  );
}