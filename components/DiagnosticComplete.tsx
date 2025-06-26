import { useTheme } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';

const DiagnosticComplete = ({
  onSubmit,
}: {
  onSubmit: (email: string) => {};
}) => {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [isValid, setIsValid] = useState(true);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (text.length > 0) {
      setIsValid(validateEmail(text));
    } else {
      setIsValid(true);
    }
  };

  const handleSubmit = () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // Call the onSubmit callback if provided
    if (onSubmit) {
      onSubmit(email);
    } else {
      Alert.alert('Success', 'Email submitted successfully!');
    }
  };

  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 16,
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
        marginHorizontal: 28,
        marginBottom: 20,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <View
        style={{
          backgroundColor: colors.primary,
          paddingVertical: 12,
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
          Email Required
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: 'rgba(255, 255, 255, 0.9)',
            textAlign: 'center',
            marginTop: 4,
          }}
        >
          Enter your email to receive the report
        </Text>
      </View>

      {/* Content */}
      <View style={{ padding: 18 }}>
        {/* Email Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email Address</Text>
          <TextInput
            style={[
              styles.emailInput,
              !isValid && email.length > 0 && styles.emailInputError,
            ]}
            placeholder="your@email.com"
            value={email}
            onChangeText={handleEmailChange}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            placeholderTextColor="#999"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            blurOnSubmit={false} // Garde le focus sur l'input
          />
          {!isValid && email.length > 0 && (
            <Text style={styles.errorText}>
              Please enter a valid email address
            </Text>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: colors.primary },
            (!email.trim() || !isValid) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!email.trim() || !isValid}
        >
          <Text style={styles.submitButtonText}>Send Report</Text>
        </TouchableOpacity>

        {/* Info Text */}
        <Text style={styles.infoText}>
          A detailed diagnostic report will be sent to your email address within
          a few minutes.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  emailInput: {
    height: 40,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#374151',
  },
  emailInputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 4,
    marginLeft: 4,
  },
  submitButton: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '400',
    color: 'white',
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default DiagnosticComplete;
