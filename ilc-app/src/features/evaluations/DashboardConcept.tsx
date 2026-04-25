import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';

// Concept UI for the AI Evaluation Dashboard based on `frontend-skill` guidelines.
// This is a dense, high-contrast, cardless layout focused on data orientation.
// No dashboard mosaics, thick borders, or generic styling.
// Focused purely on utility copy: "Average Correctness", "Hallucination Rate".

export default function AiEvaluationDashboard() {
  const [selectedCase, setSelectedCase] = useState<string | null>(null);

  // Mock data based on the evaluation schema
  const metrics = {
    totalCases: 5,
    avgCorrectness: 92.4,
    avgUsefulness: 88.0,
    hallucinationRate: 0.0, // Lower is better
  };

  const evalRuns = [
    {
      id: 'tc-emp-001',
      category: 'Employment',
      correctness: 1.0,
      hallucination: 0,
      usefulness: 0.9,
      latencyMs: 1204,
      rationale: 'Perfectly aligned with labor law regarding PHK and SP. Did not invent any clauses.',
    },
    {
      id: 'tc-crim-001',
      category: 'Criminal',
      correctness: 0.8,
      hallucination: 0,
      usefulness: 0.7,
      latencyMs: 2310,
      rationale: 'Correctly identified criminal risk, but suggested steps lacked urgency for seeking immediate counsel.',
    },
    // ... more rows
  ];

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Evaluation Matrix</Text>
        <Text style={styles.headerSubtitle}>Last sync: Today, 14:30 WIB</Text>
      </View>

      {/* KPI SECTION: Edge-to-edge typography, no cards */}
      <View style={styles.kpiContainer}>
        <View style={styles.kpiItem}>
          <Text style={styles.kpiLabel}>Correctness</Text>
          <Text style={[styles.kpiValue, { color: '#00C853' }]}>{metrics.avgCorrectness}%</Text>
        </View>
        <View style={styles.kpiItem}>
          <Text style={styles.kpiLabel}>Hallucination</Text>
          <Text style={[styles.kpiValue, metrics.hallucinationRate > 0 ? { color: '#D73A4A' } : { color: '#111827' }]}>
            {metrics.hallucinationRate}%
          </Text>
        </View>
        <View style={styles.kpiItem}>
          <Text style={styles.kpiLabel}>Usefulness</Text>
          <Text style={styles.kpiValue}>{metrics.avgUsefulness}%</Text>
        </View>
        <View style={styles.kpiItem}>
          <Text style={styles.kpiLabel}>Volume</Text>
          <Text style={styles.kpiValue}>{metrics.totalCases}</Text>
        </View>
      </View>

      {/* TABLE WORKSPACE: Clean rows, minimal chrome */}
      <ScrollView style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={[styles.cell, styles.cellSmall]}>ID</Text>
          <Text style={[styles.cell, styles.cellMedium]}>Category</Text>
          <Text style={[styles.cell, styles.cellSmall]}>Correct</Text>
          <Text style={[styles.cell, styles.cellSmall]}>Halluc</Text>
          <Text style={[styles.cell, styles.cellSmall]}>Useful</Text>
          <Text style={[styles.cell, styles.cellLarge]}>Judge Rationale</Text>
        </View>

        {evalRuns.map((run) => (
          <Pressable
            key={run.id}
            onPress={() => setSelectedCase(run.id)}
            style={[
              styles.tableRow,
              selectedCase === run.id && styles.tableRowSelected,
            ]}
          >
            <Text style={[styles.cell, styles.cellSmall, styles.cellBold]}>{run.id}</Text>
            <Text style={[styles.cell, styles.cellMedium]}>{run.category}</Text>
            <Text style={[styles.cell, styles.cellSmall, run.correctness >= 0.9 ? styles.textSuccess : styles.textWarning]}>
              {(run.correctness * 100).toFixed(0)}%
            </Text>
            <Text style={[styles.cell, styles.cellSmall, run.hallucination > 0 ? styles.textDanger : styles.textSuccess]}>
              {run.hallucination}
            </Text>
            <Text style={[styles.cell, styles.cellSmall]}>{(run.usefulness * 100).toFixed(0)}%</Text>
            <Text style={[styles.cell, styles.cellLarge]} numberOfLines={1} ellipsizeMode="tail">
              {run.rationale}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA', // Calm, off-white background
    padding: 24,
  },
  header: {
    marginBottom: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  kpiContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 48,
  },
  kpiItem: {
    flex: 1,
  },
  kpiLabel: {
    fontSize: 13,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 48,
    fontWeight: '300',
    color: '#111827',
    letterSpacing: -1.5,
  },
  tableContainer: {
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#D1D5DB',
    paddingBottom: 12,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tableRowSelected: {
    backgroundColor: '#EFF6FF',
  },
  cell: {
    fontSize: 14,
    color: '#374151',
  },
  cellSmall: {
    flex: 1,
  },
  cellMedium: {
    flex: 2,
  },
  cellLarge: {
    flex: 4,
  },
  cellBold: {
    fontWeight: '600',
    color: '#111827',
  },
  textSuccess: {
    color: '#00C853',
  },
  textWarning: {
    color: '#F59E0B',
  },
  textDanger: {
    color: '#D73A4A',
    fontWeight: '600',
  },
});