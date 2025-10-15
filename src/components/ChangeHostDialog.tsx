import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
} from "@mui/material";
import { Person } from "@mui/icons-material";
import { User } from "../types";

interface ChangeHostDialogProps {
  open: boolean;
  onClose: () => void;
  members: User[];
  onSelect: (member: User) => void;
  currentHostId?: string;
}

const ChangeHostDialog: React.FC<ChangeHostDialogProps> = ({
  open,
  onClose,
  members,
  onSelect,
  currentHostId,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleConfirm = () => {
    if (!selectedId) return;
    const selected = members.find((m) => m.id === selectedId);
    if (selected) onSelect(selected);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Chuyển Host</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Chọn người dùng làm host mới cho lịch này:
        </Typography>
        <List dense>
          {members.map((m) => (
            <ListItemButton
              key={m.id}
              selected={selectedId === m.id}
              onClick={() => setSelectedId(m.id)}
            >
              <ListItemAvatar>
                <Avatar src={m.photoURL}>
                  <Person />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={m.displayName}
                secondary={m.role}
                primaryTypographyProps={{ fontWeight: 500 }}
              />
              {m.id === currentHostId && (
                <Typography variant="caption" color="primary">
                  (Hiện tại)
                </Typography>
              )}
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Hủy</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="primary"
          disabled={!selectedId}
        >
          Lưu
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChangeHostDialog;
