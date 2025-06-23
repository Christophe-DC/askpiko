import { useEffect, useRef } from 'react';
import { Accelerometer } from 'expo-sensors';

export const useShakeDetection = (
  onShake: () => void,
  enabled: boolean = true,
  threshold: number = 2.5 // Seuil plus réaliste
) => {
  const lastShakeTime = useRef<number>(0);
  const subscription = useRef<any>(null);
  const lastAcceleration = useRef({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    const startShakeDetection = async () => {
      try {
        // Vérifier si l'accéléromètre est disponible
        const isAvailable = await Accelerometer.isAvailableAsync();
        if (!isAvailable) {
          console.warn('Accelerometer not available on this device');
          return;
        }

        if (enabled) {
          // Définir l'intervalle de mise à jour
          Accelerometer.setUpdateInterval(100);

          subscription.current = Accelerometer.addListener(({ x, y, z }) => {
            // Calculer la différence d'accélération (delta)
            const deltaX = Math.abs(x - lastAcceleration.current.x);
            const deltaY = Math.abs(y - lastAcceleration.current.y);
            const deltaZ = Math.abs(z - lastAcceleration.current.z);

            // Calculer l'accélération totale du changement
            const totalDelta = Math.sqrt(
              deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ
            );

            // Sauvegarder les valeurs actuelles pour la prochaine comparaison
            lastAcceleration.current = { x, y, z };

            // Détecter le shake basé sur le changement d'accélération
            if (totalDelta > threshold) {
              const currentTime = Date.now();

              // Éviter les détections multiples rapprochées
              if (currentTime - lastShakeTime.current > 500) {
                lastShakeTime.current = currentTime;
                console.log(
                  `Shake détecté! Delta: ${totalDelta.toFixed(
                    2
                  )}, Accélération: x=${x.toFixed(2)}, y=${y.toFixed(
                    2
                  )}, z=${z.toFixed(2)}`
                );
                onShake();
              }
            }
          });
        }
      } catch (error) {
        console.error(
          "Erreur lors de l'initialisation de l'accéléromètre:",
          error
        );
      }
    };

    startShakeDetection();

    return () => {
      if (subscription.current) {
        subscription.current.remove();
        subscription.current = null;
      }
    };
  }, [enabled, onShake, threshold]);

  // Fonction pour nettoyer manuellement
  const cleanup = () => {
    if (subscription.current) {
      subscription.current.remove();
      subscription.current = null;
    }
  };

  return { cleanup };
};
