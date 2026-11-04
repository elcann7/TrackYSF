import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Icon, PressableScale, haptic } from '@/components/ui';
import type { MealType } from '@/lib/db';
import { lookupBarcode } from '@/lib/foods';
import { setPickedFood } from '@/lib/selection';
import { useApp } from '@/lib/store';
import { colors, radius, space } from '@/theme';

export default function Scan() {
  const insets = useSafeAreaInsets();
  const { t } = useApp();
  const params = useLocalSearchParams<{ date?: string; meal?: MealType }>();
  const [perm, requestPerm] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const lastCode = useRef<string | null>(null);

  const onScan = async (r: BarcodeScanningResult) => {
    if (busy || r.data === lastCode.current) return;
    lastCode.current = r.data;
    setBusy(true);
    haptic.tap();
    try {
      const food = await lookupBarcode(r.data);
      if (food) {
        haptic.success();
        setPickedFood(food);
        router.replace({ pathname: '/food-amount', params: { date: params.date ?? '', meal: params.meal ?? '' } });
        return;
      }
      haptic.error();
      Alert.alert(t('barcodeNotFound'), r.data, [
        { text: t('cancel'), style: 'cancel', onPress: () => (lastCode.current = null) },
        { text: t('createFood'), onPress: () => router.replace('/create-food') },
      ]);
    } catch {
      Alert.alert(t('errNet'));
      lastCode.current = null;
    } finally {
      setBusy(false);
    }
  };

  if (!perm) return <View style={{ flex: 1, backgroundColor: '#000' }} />;

  if (!perm.granted) {
    return (
      <View style={[styles.center, { paddingBottom: insets.bottom + space.xl }]}>
        <Icon name="barcode.viewfinder" size={48} color={colors.accent} />
        <Text style={styles.msg}>{t('cameraNeeded')}</Text>
        <Button title={t('allow')} onPress={requestPerm} style={{ alignSelf: 'stretch' }} />
        <Button title={t('cancel')} variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={busy ? undefined : onScan}
      />
      <View style={[styles.top, { paddingTop: insets.top + space.sm }]}>
        <PressableScale onPress={() => router.back()} style={styles.close}>
          <Icon name="xmark" size={16} color="#fff" weight="semibold" />
        </PressableScale>
      </View>
      <View pointerEvents="none" style={styles.frameWrap}>
        <View style={styles.frame} />
        <Text style={styles.hint}>{t('scanHint')}</Text>
        {busy && <ActivityIndicator color="#fff" style={{ marginTop: space.lg }} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.lg },
  msg: { color: colors.text, fontSize: 16, textAlign: 'center', lineHeight: 22 },
  top: { position: 'absolute', left: 0, right: 0, paddingHorizontal: space.lg },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  frameWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  frame: { width: 280, height: 160, borderRadius: radius.lg, borderWidth: 3, borderColor: colors.accent },
  hint: { color: '#fff', fontSize: 15, fontWeight: '600', marginTop: space.lg, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4 },
});
