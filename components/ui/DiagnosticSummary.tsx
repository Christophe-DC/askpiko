import { useTheme } from '@react-navigation/native';
import React from 'react';
import { View, Text, ScrollView } from 'react-native';

const DiagnosticSummary = ({ testResults }) => {
  const { colors } = useTheme();
  // Définition des tests avec leurs noms d'affichage
  const tests = [
    { key: 'device_detection_test', name: 'Device Detection' },
    { key: 'display_color_test', name: 'Display Color' },
    { key: 'touch_test', name: 'Touch Screen' },
    { key: 'button_test', name: 'Physical Buttons' },
    { key: 'microphone_test', name: 'Microphone' },
    { key: 'sensor_test', name: 'Sensors' },
    { key: 'camera_test', name: 'Camera' },
  ];

  // Calcul du nombre de tests réussis
  const passedTests = tests.filter(
    (test) => testResults[test.key] === true
  ).length;
  const totalTests = tests.length;

  // Composant pour afficher chaque test
  const TestItem = ({ testName, passed }) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10, // Réduit de 12 à 10
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
      }}
    >
      <Text
        style={{
          fontSize: 16,
          color: '#374151',
          fontWeight: '500',
          flex: 1,
        }}
      >
        {testName}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: passed ? '#10b981' : '#ef4444',
            marginRight: 8,
          }}
        />
        <Text
          style={{
            fontSize: 14,
            fontWeight: '600',
            color: passed ? '#10b981' : '#ef4444',
          }}
        >
          {passed ? 'PASSED' : 'FAILED'}
        </Text>
      </View>
    </View>
  );

  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 16,
        width: '100%',
        shadowColor: colors.primary,
        shadowOffset: {
          width: 0,
          height: 5,
        },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        marginBottom: 60,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <View
        style={{
          backgroundColor: colors.primary,
          paddingVertical: 16,
          paddingHorizontal: 20,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: '600',
            color: 'white',
            textAlign: 'center',
          }}
        >
          Diagnostic Summary
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: 'rgba(255, 255, 255, 0.9)',
            textAlign: 'center',
            marginTop: 4,
          }}
        >
          {passedTests} out of {totalTests} tests passed
        </Text>
      </View>

      {/* Liste des tests - ScrollView avec hauteur limitée */}
      <ScrollView
        style={{
          maxHeight: 200, // Limite la hauteur à 200px
        }}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
      >
        {tests.map((test, index) => (
          <TestItem
            key={test.key}
            testName={test.name}
            passed={testResults[test.key] === true}
          />
        ))}
      </ScrollView>

      {/* Résumé global */}
      <View
        style={{
          backgroundColor: passedTests === totalTests ? '#f0fdf4' : '#fef2f2',
          paddingVertical: 12, // Réduit de 16 à 12
          paddingHorizontal: 20,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: '600',
            color: passedTests === totalTests ? '#16a34a' : '#dc2626',
            textAlign: 'center',
          }}
        >
          {passedTests === totalTests
            ? '✅ All tests passed successfully!'
            : `⚠️ ${totalTests - passedTests} test(s) failed`}
        </Text>
      </View>
    </View>
  );
};

export default DiagnosticSummary;
