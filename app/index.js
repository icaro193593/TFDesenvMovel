import { router } from 'expo-router';
import { Button, Text, View } from 'react-native';

export default function InicioScreen() {
  return (
    <View>
      <Text>Página inicial</Text>
      <Button title="Catálogo" onPress={() => router.push('/catalogo')} />
      <Button title="Coleções e Caixas" onPress={() => router.push('/colecoes')} />
      <Button title="Abertura de Caixas" onPress={() => router.push('/caixas')} />
      <Button title="Contrato de Trocas" onPress={() => router.push('/contrato')} />
      <Button title="Inventário Aleatório" onPress={() => router.push('/inventario')} />
      <Button title="Favoritos" onPress={() => router.push('/favoritos')} />
      <Button title="Configurações" onPress={() => router.push('/configuracoes')} />
    </View>
  );
}
