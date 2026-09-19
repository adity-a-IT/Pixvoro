import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RecentPDF } from '../types';
import { useApp } from '../context/AppContext';
import { formatDate, formatBytes } from '../utils/helpers';
import { BorderRadius, Spacing } from '../theme';
import { Button } from './Button';

interface RecentPdfCardProps {
  item: RecentPDF;
  onOpen: (pdf: RecentPDF) => void;
  onShare: (pdf: RecentPDF) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onEdit?: (pdf: RecentPDF) => void;
}

export const RecentPdfCard: React.FC<RecentPdfCardProps> = ({
  item,
  onOpen,
  onShare,
  onDelete,
  onRename,
  onEdit,
}) => {
  const { theme } = useApp();
  const colors = theme.colors;
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [newNameInput, setNewNameInput] = useState(item.name.replace(/\.pdf$/i, ''));

  const handleSaveRename = () => {
    if (newNameInput.trim()) {
      onRename(item.id, newNameInput.trim());
      setIsRenameModalVisible(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onOpen(item)}
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={styles.leftContent}>
          <View style={[styles.pdfIconBadge, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="document-text-outline" size={24} color={colors.primary} />
          </View>
          <View style={styles.textWrap}>
            <Text numberOfLines={1} style={[styles.pdfTitle, { color: colors.textPrimary }]}>
              {item.name}
            </Text>
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {formatDate(item.createdAt)} • {item.pageCount} {item.pageCount === 1 ? 'page' : 'pages'} • {formatBytes(item.fileSize)}
            </Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          {onEdit && (
            <TouchableOpacity
              onPress={() => onEdit(item)}
              style={[styles.actionBtn, { backgroundColor: colors.primaryLight }]}
              accessibilityLabel="Edit PDF"
            >
              <Ionicons name="create-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => onShare(item)}
            style={[styles.actionBtn, { backgroundColor: colors.surfaceSecondary }]}
            accessibilityLabel="Share PDF"
          >
            <Ionicons name="share-social-outline" size={18} color={colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsRenameModalVisible(true)}
            style={[styles.actionBtn, { backgroundColor: colors.surfaceSecondary }]}
            accessibilityLabel="Rename PDF"
          >
            <Ionicons name="pencil-outline" size={18} color={colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onDelete(item.id)}
            style={[styles.actionBtn, { backgroundColor: colors.dangerLight }]}
            accessibilityLabel="Delete PDF"
          >
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Rename Modal */}
      <Modal visible={isRenameModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Rename PDF</Text>
            <TextInput
              style={[
                styles.textInput,
                { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
              ]}
              value={newNameInput}
              onChangeText={setNewNameInput}
              autoFocus
              selectTextOnFocus
              placeholder="Enter new filename"
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.modalBtns}>
              <Button
                title="Cancel"
                variant="secondary"
                size="sm"
                onPress={() => setIsRenameModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Save"
                variant="primary"
                size="sm"
                onPress={handleSaveRename}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm + 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  pdfIconBadge: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm + 2,
  },
  textWrap: {
    flex: 1,
  },
  pdfTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  metaText: {
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  textInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
    marginBottom: Spacing.lg,
  },
  modalBtns: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
});
