import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Drawer } from 'expo-router/drawer';
import { MaterialIcons } from '@expo/vector-icons';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Drawer
        screenOptions={{
          headerShown: true,
          drawerType: 'front',
        }}
      >
        <Drawer.Screen
          name="index"
          options={{
            title: 'Início',
            drawerIcon: ({ color, size }) => (
              <MaterialIcons name="home" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="catalogo"
          options={{
            title: 'Catálogo',
            drawerIcon: ({ color, size }) => (
              <MaterialIcons name="grid-view" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="colecoes"
          options={{
            title: 'Coleções e Caixas',
            drawerIcon: ({ color, size }) => (
              <MaterialIcons name="collections" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="caixas"
          options={{
            title: 'Abertura de Caixas',
            drawerIcon: ({ color, size }) => (
              <MaterialIcons name="card-giftcard" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="contrato"
          options={{
            title: 'Contrato de Trocas',
            drawerIcon: ({ color, size }) => (
              <MaterialIcons name="swap-horiz" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="inventario"
          options={{
            title: 'Inventário Aleatório',
            drawerIcon: ({ color, size }) => (
              <MaterialIcons name="shuffle" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="favoritos"
          options={{
            title: 'Favoritos',
            drawerIcon: ({ color, size }) => (
              <MaterialIcons name="favorite" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="detalhes"
          options={{
            title: 'Detalhes da Skin',
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="configuracoes"
          options={{
            title: 'Configurações',
            drawerIcon: ({ color, size }) => (
              <MaterialIcons name="settings" size={size} color={color} />
            ),
          }}
        />
      </Drawer>
    </SafeAreaProvider>
  );
}
