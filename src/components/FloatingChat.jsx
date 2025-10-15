'use client'

import { useState, useEffect, useRef } from 'react'; // ✅ 1. Importa useRef e useEffect
import {
  Box,
  Button,
  VStack,
  HStack,
  Input,
  Text,
  IconButton,
  Heading,
  Spinner 
} from '@chakra-ui/react';
import { SlideFade, ScaleFade } from '@chakra-ui/transition';
import { MessageCircle, X, ArrowUp } from 'lucide-react';


export const FloatingChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Olá! Como posso ajudar você hoje?' },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // ✅ 2. Cria uma ref para o container das mensagens
  const messagesContainerRef = useRef(null);

  // ✅ 3. Efeito para rolar para a última mensagem sempre que a lista de mensagens mudar
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      // Define o scroll top para a altura total do container, movendo a visão para o final
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);


  const handleSendMessage = async () => {
    if (inputValue.trim() === '' || isLoading) return;

    const userMessage = { sender: 'user', text: inputValue };
    setMessages((prev) => [...prev, userMessage]);
    const currentMessage = inputValue;
    setInputValue('');
    setIsLoading(true);

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: currentMessage
            }),
        });

        if (!response.ok) {
           throw new Error(`O servidor respondeu com status: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }
        
        const botResponse = { sender: 'bot', text: data.reply };
        
        setMessages((prev) => [...prev, botResponse]);

    } catch (error) {
        console.error("Erro no handleSendMessage:", error);
        const errorResponse = { sender: 'bot', text: 'Desculpe, ocorreu um erro. Tente novamente mais tarde.' };
        setMessages((prev) => [...prev, errorResponse]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') handleSendMessage();
  };

  return (
    <Box position="fixed" bottom="2rem" right="2rem" zIndex="tooltip" justifyContent={"end"} display={"flex"} alignItems={"end"}>
      <SlideFade in={isOpen} offsetY="40px">
        <Box
          w="500px"
          h="500px"
          bg="gray.800"
          borderRadius="lg"
          boxShadow="2xl"
          display="flex"
          flexDirection="column"
          overflow="hidden"
        >
          {/* Cabeçalho */}
          <HStack p={4} bg="blue.600" color="white" justify="space-between">
            <Heading size="sm">Fale Conosco</Heading>
            <IconButton
              icon={<Box as={X} boxSize="16px" />}
              size="sm"
              isRound
              variant="ghost"
              color="white"
              _hover={{ bg: 'blue.700' }}
              onClick={() => setIsOpen(false)}
              aria-label="Fechar chat"
            />
          </HStack>

          {/* Mensagens */}
          {/* ✅ 4. Atribui a ref ao container que tem o overflow */}
          <VStack ref={messagesContainerRef} flex="1" p={4} spacing={4} overflowY="auto" align="stretch">
            {messages.map((msg, index) => (
              <Box
                key={index}
                bg={msg.sender === 'user' ? 'green.500' : 'gray.700'}
                p={3}
                borderRadius="lg"
                alignSelf={msg.sender === 'user' ? 'flex-end' : 'flex-start'}
                maxW="80%"
              >
                <Text color="white">{msg.text}</Text>
              </Box>
            ))}
            {/* Adiciona um ponto de carregamento visual simples */}
            {isLoading && (
              <Box alignSelf="flex-start" display={"flex"} gap={3}>
                  <Spinner size="sm" />
                  <Text color="gray.400" fontSize="sm">Digitando...</Text>
              </Box>
            )}
          </VStack>

          {/* Input */}
          <HStack p={2} borderTopWidth="1px" borderColor="gray.700">
            <Input
              placeholder="Digite sua mensagem..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              bg="gray.900"
              border="none"
              _focus={{ ring: '2px', ringColor: 'blue.400' }}
              disabled={isLoading} // Desabilita o input durante o carregamento
            />
            <IconButton
              icon={<ArrowUp size={18} />}
              colorScheme="blue"
              isRound
              onClick={handleSendMessage}
              aria-label="Enviar mensagem"
              isLoading={isLoading} // Mostra um spinner no botão durante o carregamento
            />
          </HStack>
        </Box>
      </SlideFade>

      {/* BOTÃO FLUTUANTE */}
      <ScaleFade in={!isOpen} initialScale={0.8}>
        <Button
          colorScheme="blue"
          borderRadius="full"
          boxShadow="xl"
          w="60px"
          h="60px"
          onClick={() => setIsOpen(true)}
          aria-label="Abrir chat"
          display={isOpen ? 'none' : 'flex'}
          justifyContent="center"
          alignItems="center"
        >
          <Box as={MessageCircle} boxSize="22px" />
        </Button>
      </ScaleFade>
    </Box>
  );
};