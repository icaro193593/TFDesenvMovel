import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Drawer } from 'expo-router/drawer';
import { CORES } from '../constants/cs2Theme';

// Layout raiz com menu lateral (Drawer) seguindo o tutorial
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />

      <Drawer
        screenOptions={{
          headerStyle: {
            backgroundColor: CORES.azulPrincipal,
          },
          headerTintColor: CORES.branco,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          drawerStyle: {
            backgroundColor: CORES.branco,
          },
          drawerActiveTintColor: CORES.azulPrincipal,
          drawerActiveBackgroundColor: CORES.azulClaro,
          drawerInactiveTintColor: CORES.textoSecundario,
          sceneContainerStyle: {
            backgroundColor: CORES.fundo,
          },
        }}
      >
        <Drawer.Screen
          name="index"
          options={{
            title: 'Início',
          }}
        />
        <Drawer.Screen
          name="catalogo"
          options={{
            title: 'Catálogo',
          }}
        />
        <Drawer.Screen
          name="caixas"
          options={{
            title: 'Caixas',
          }}
        />
        <Drawer.Screen
          name="contrato"
          options={{
            title: 'Contrato de Trocas',
          }}
        />
        <Drawer.Screen
          name="inventario"
          options={{
            title: 'Inventário',
          }}
        />
        <Drawer.Screen
          name="higherlower"
          options={{
            title: 'Higher or Lower',
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
          }}
        />
      </Drawer>
    </SafeAreaProvider>
  );
}
