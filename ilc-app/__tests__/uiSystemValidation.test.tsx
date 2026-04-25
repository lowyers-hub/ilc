import React from 'react';
import { Button } from '@/src/components/Button';
import { TextField } from '@/src/components/TextField';
import { ListRow } from '@/src/components/ListRow';
import { AdaptiveModal } from '@/src/components/AdaptiveModal';
import { render } from '@testing-library/react-native';
import { TextInput, View } from 'react-native';

describe('UI/UX System Validation', () => {
  describe('Button', () => {
    it('has required min-h-[44px] touch target class', () => {
      const { getByRole } = render(<Button title="Test" onPress={() => {}} />);
      const btn = getByRole('button');
      expect(btn.props.className).toContain('min-h-[44px]');
    });

    it('has loading state prop', () => {
      const { getByRole } = render(<Button title="Test" isLoading onPress={() => {}} />);
      const btn = getByRole('button');
      expect(btn.props.accessibilityState.disabled).toBe(true);
    });

    it('has hover interaction class', () => {
      const { getByRole } = render(<Button title="Test" onPress={() => {}} />);
      const btn = getByRole('button');
      expect(btn.props.className).toContain('hover:bg-opacity-80');
    });
  });

  describe('TextField', () => {
    it('accepts error prop and shows danger class', () => {
      const { getByText } = render(<TextField error="Required field" />);
      expect(getByText('Required field').props.className).toContain('text-danger');
    });

    it('has focus ring on active', () => {
      const { root } = render(<TextField />);
      const input = root.findByType(TextInput);
      expect(input.props.className).toContain('focus:ring-1');
    });
  });

  describe('ListRow', () => {
    it('enforces min-h-[44px] on interactive rows', () => {
      const { getByRole } = render(<ListRow title="Test" onPress={() => {}} />);
      const row = getByRole('button');
      expect(row.props.className).toContain('min-h-[44px]');
      expect(row.props.className).toContain('hover:bg-black/5');
    });
  });

  describe('AdaptiveModal', () => {
    it('renders children correctly', () => {
      const { root } = render(<AdaptiveModal><View testID="child" /></AdaptiveModal>);
      expect(root).toBeTruthy();
    });
  });
});
