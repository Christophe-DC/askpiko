import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useDiagnosticStore } from '@/store/diagnosticStore';
import Typography from './Typography';
import { designTokens } from '@/styles/tokens';

const { width, height } = Dimensions.get('window');

interface TouchGridTestProps {
  onComplete: () => void;
  onTimeout: () => void;
  timeoutSeconds: number;
}

export default function TouchGridTest({ onComplete, onTimeout, timeoutSeconds }: TouchGridTestProps) {
  const { colors } = useTheme();
  const { 
    touchGrid, 
    touchGridSize, 
    initializeTouchGrid, 
    tapGridCell, 
    checkTouchGridComplete 
  } = useDiagnosticStore();
  
  const [timeLeft, setTimeLeft] = useState(timeoutSeconds);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!isInitialized) {
      initializeTouchGrid();
      setIsInitialized(true);
    }
  }, [isInitialized, initializeTouchGrid]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onTimeout]);

  useEffect(() => {
    if (touchGrid.length > 0 && checkTouchGridComplete()) {
      onComplete();
    }
  }, [touchGrid, checkTouchGridComplete, onComplete]);

  const handleCellPress = (row: number, col: number) => {
    tapGridCell(row, col);
  };

  const cellWidth = (width - 40) / touchGridSize.cols;
  const cellHeight = (height - 200) / touchGridSize.rows;
  const cellSize = Math.min(cellWidth, cellHeight);

  const completedCells = touchGrid.reduce((total, row) => 
    total + row.filter(cell => cell).length, 0
  );
  const totalCells = touchGridSize.rows * touchGridSize.cols;
  const progress = (completedCells / totalCells) * 100;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Typography variant="h4" align="center" style={styles.title}>
          Touch Screen Test
        </Typography>
        <Typography variant="body" color="secondary" align="center">
          Tap every square to test touchscreen responsiveness
        </Typography>
        
        <View style={styles.stats}>
          <Typography variant="label" color="primary">
            Progress: {completedCells}/{totalCells} ({Math.round(progress)}%)
          </Typography>
          <Typography variant="label" color="error">
            Time: {timeLeft}s
          </Typography>
        </View>
      </View>

      <View style={[styles.gridContainer, { backgroundColor: colors.surfaceSecondary }]}>
        {touchGrid.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.gridRow}>
            {row.map((cell, colIndex) => (
              <TouchableOpacity
                key={`${rowIndex}-${colIndex}`}
                style={[
                  styles.gridCell,
                  {
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: cell ? colors.success : colors.border,
                    borderColor: colors.text,
                  }
                ]}
                onPress={() => handleCellPress(rowIndex, colIndex)}
                activeOpacity={0.7}
              >
                {cell && (
                  <View style={[styles.checkMark, { backgroundColor: colors.surface }]}>
                    <Typography variant="caption" style={{ color: colors.success }}>
                      ✓
                    </Typography>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progress}%`,
                backgroundColor: colors.primary,
              }
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: designTokens.spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: designTokens.spacing.lg,
  },
  title: {
    marginBottom: designTokens.spacing.sm,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: designTokens.spacing.md,
    paddingHorizontal: designTokens.spacing.md,
  },
  gridContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: designTokens.borderRadius.lg,
    padding: designTokens.spacing.sm,
  },
  gridRow: {
    flexDirection: 'row',
  },
  gridCell: {
    borderWidth: 1,
    margin: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMark: {
    width: '80%',
    height: '80%',
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    marginTop: designTokens.spacing.lg,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
});