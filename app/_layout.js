import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Drawer } from 'expo-router/drawer';
import { MaterialIcons } from '@expo/vector-icons';
import { CORES, BORDAS } from '../constants/cs2Theme';

export default function RootLayout() {
  return (
    // SafeAreaProvider envolve toda a aplicação respeitando a hierarquia do Prof. Victor
    <SafeAreaProvider>
      {/* StatusBar clara para contraste perfeito com o tema escuro tático CS2 */}
      <StatusBar style="light" backgroundColor={CORES.fundoSuperficie} />

      <Drawer
        screenOptions={{
          headerShown: true,
          drawerType: 'front',
          headerStyle: {
            backgroundColor: CORES.fundoSuperficie,
            borderBottomWidth: 1,
            borderBottomColor: CORES.borda,
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTintColor: CORES.textoPrincipal,
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 18,
            color: CORES.textoPrincipal,
            letterSpacing: 0.5,
          },
          drawerStyle: {
            width: 290,
            backgroundColor: CORES.fundoSuperficie,
            borderRightWidth: 1,
            borderRightColor: CORES.borda,
          },
          drawerActiveTintColor: CORES.laranjaCs,
          drawerActiveBackgroundColor: 'rgba(245, 130, 32, 0.12)',
          drawerInactiveTintColor: CORES.textoSecundario,
          drawerLabelStyle: {
            fontSize: 14,
            fontWeight: '600',
            marginLeft: -8,
          },
          drawerItemStyle: {
            borderRadius: BORDAS.md,
            marginHorizontal: 10,
            marginVertical: 3,
            paddingHorizontal: 4,
          },
          sceneContainerStyle: {
            backgroundColor: CORES.fundoApp,
          },
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
            title: 'Catálogo de Skins',
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
            title: 'Inventário Pessoal',
            drawerIcon: ({ color, size }) => (
              <MaterialIcons name="inventory" size={size} color={color} />
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
