import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Drawer } from 'expo-router/drawer';
import { MaterialIcons } from '@expo/vector-icons';

export default function RootLayout() {
  return (
    // SafeAreaProvider garante que o app respeite entalhes e barras do sistema
    <SafeAreaProvider>
      {/* StatusBar clara para contrastar com o cabeçalho azul CS2 */}
      <StatusBar style="light" />

      <Drawer
        screenOptions={{
          headerShown: true,
          drawerType: 'front',
          headerStyle: {
            backgroundColor: '#1E4C8A',
            borderBottomWidth: 3,
            borderBottomColor: '#F58220',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold', color: '#FFFFFF' },
          drawerStyle: { width: 280, backgroundColor: '#FFFFFF' },
          drawerActiveTintColor: '#C95F08',
          drawerActiveBackgroundColor: '#FFF3E8',
          drawerInactiveTintColor: '#1E4C8A',
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
            title: 'Inventário',
            drawerIcon: ({ color, size }) => (
              <MaterialIcons name="shuffle" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="higherlower"
          options={{
            title: 'Higher or Lower',
            drawerIcon: ({ color, size }) => (
              <MaterialIcons name="trending-up" size={size} color={color} />
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
