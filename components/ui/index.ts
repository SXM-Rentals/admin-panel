// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: A single front door for all the shared building blocks.
// It means a screen can write one line —
//
//   import { Button, Card, Text } from '@/components/ui';
//
// instead of a separate line for every piece. The names match the customer
// website's exactly, so the two codebases stay readable alongside each other and
// a screen can be moved between them without its imports being rewritten.
//
// The website also exports a theme toggle and a language picker from here. This
// panel has neither: it is dark only and English only. See app/globals.css.

export { Text, type TextProps } from './Text';
export { Icon, type IconName, type IconProps } from './Icon';
export { Button, type ButtonProps } from './Button';
export { IconButton, type IconButtonProps } from './IconButton';
export { Logo, type LogoProps } from './Logo';
export { Card, SectionHeader, Divider, type CardProps } from './Card';
export { Input, PasswordInput, TextArea, type InputProps, type TextAreaProps } from './Input';
export { Chip, ChipRow, SegmentedControl, Checkbox, Toggle } from './Controls';
export {
  MockBanner,
  StatusPill,
  EmptyState,
  Skeleton,
  type StatusTone,
} from './Feedback';
export { Avatar, PhotoPlaceholder } from './Placeholders';
export { ListRow, ListGroup, type ListRowProps } from './ListRow';
export { Sheet, Dialog, type SheetProps } from './Sheet';
export { ErrorState, AppErrorBoundary } from './ErrorState';
export { ToastProvider, useToast } from './Toast';
