import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import ScreenLayout from '../components/ScreenLayout';
import {
  Badge,
  Card,
  ErrorBanner,
  InputField,
  LoadingView,
  PrimaryButton,
  SecondaryButton,
  SectionTitle,
  StatCard,
  SuccessBanner,
} from '../components/ui';
import { colors, radius, spacing } from '../theme';

const STATUS_TONES = {
  PENDING: 'warning',
  APPROVED: 'brand',
  FUND_SENT: 'brand',
  RECEIVED: 'success',
  REJECTED: 'danger',
  DISPUTED: 'warning',
};

function FundRequestCard({
  req,
  isAdmin,
  expanded,
  onToggle,
  onAccept,
  onApprove,
  onReject,
  onDispute,
  onAddNote,
  noteText,
  onNoteTextChange,
  notes,
  loadingNotes,
  approveAmount,
  onApproveAmountChange,
}) {
  const requesterName = req.requestedBy?.name || req.requesterType;

  return (
    <Card style={[styles.card, expanded && styles.cardExpanded]} elevated>
      <Pressable onPress={onToggle} style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>₹{(req.requestedAmount ?? 0).toLocaleString()}</Text>
          <Text style={styles.cardMeta}>
            {requesterName} · {new Date(req.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <Badge label={req.status} tone={STATUS_TONES[req.status] || 'neutral'} />
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textMuted}
          style={{ marginLeft: 4 }}
        />
      </Pressable>

      {req.notes ? (
        <Text style={styles.inlineNote}>Request note: {req.notes}</Text>
      ) : null}
      {req.approvedAmount != null ? (
        <Text style={styles.inlineApproved}>
          Approved: ₹{(req.approvedAmount ?? 0).toLocaleString()}
          {req.approvedAmount !== req.requestedAmount
            ? ` (requested ₹${(req.requestedAmount ?? 0).toLocaleString()})`
            : ''}
        </Text>
      ) : null}
      {req.rejectReason ? (
        <Text style={styles.inlineReject}>Rejected: {req.rejectReason}</Text>
      ) : null}
      {req.sentNotes ? (
        <Text style={styles.inlineNote}>Transfer note: {req.sentNotes}</Text>
      ) : null}
      {req.disputeReason ? (
        <Text style={styles.inlineReject}>Dispute: {req.disputeReason}</Text>
      ) : null}

      {expanded ? (
        <View style={styles.expanded}>
          <Text style={styles.notesTitle}>Conversation</Text>
          {loadingNotes ? (
            <Text style={styles.cardMeta}>Loading notes...</Text>
          ) : notes.length ? (
            notes.map((n) => (
              <View key={n.id} style={styles.noteBubble}>
                <Text style={styles.noteAuthor}>
                  {n.author?.name || 'User'} · {new Date(n.createdAt).toLocaleString()}
                </Text>
                <Text style={styles.noteBody}>{n.body}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.cardMeta}>No notes yet</Text>
          )}

          <InputField
            value={noteText}
            onChangeText={onNoteTextChange}
            placeholder="Add a note..."
            multiline
          />
          <SecondaryButton title="Send note" onPress={onAddNote} />

          {req.status === 'FUND_SENT' && !isAdmin ? (
            <View style={styles.actions}>
              <PrimaryButton title="Accept Funds" onPress={() => onAccept(req.id)} />
              <SecondaryButton title="Dispute" danger onPress={() => onDispute(req.id)} />
            </View>
          ) : null}

          {isAdmin && req.status === 'PENDING' ? (
            <View style={styles.actions}>
              <InputField
                label="Approved amount"
                value={approveAmount}
                onChangeText={onApproveAmountChange}
                keyboardType="numeric"
                placeholder={String(req.requestedAmount ?? '')}
              />
              <PrimaryButton
                title={`Approve ₹${Number(approveAmount || req.requestedAmount || 0).toLocaleString()}`}
                onPress={() => onApprove(req.id, Number(approveAmount || req.requestedAmount))}
              />
              <SecondaryButton title="Reject" danger onPress={() => onReject(req.id)} />
            </View>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

export default function FundRequestsScreen({ navigation, route }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const highlightId = route?.params?.highlightId;

  const [calculation, setCalculation] = useState(null);
  const [requests, setRequests] = useState([]);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(highlightId ?? null);
  const [threadNotes, setThreadNotes] = useState({});
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [replyText, setReplyText] = useState({});
  const [approveAmounts, setApproveAmounts] = useState({});

  const load = async () => {
    try {
      if (isAdmin) {
        const reqRes = await api.get('/fund-requests');
        setRequests(reqRes.data);
      } else {
        const [calcRes, reqRes] = await Promise.all([
          api.get('/fund-requests/calculate'),
          api.get('/fund-requests'),
        ]);
        setCalculation(calcRes.data);
        setRequests(reqRes.data);
        setAmount(String(calcRes.data.fundNeeded || ''));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadNotes = async (id) => {
    setLoadingNotes(true);
    try {
      const res = await api.get(`/fund-requests/${id}/notes`);
      setThreadNotes((prev) => ({ ...prev, [id]: res.data ?? [] }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingNotes(false);
    }
  };

  useEffect(() => {
    load();
  }, [isAdmin]);

  useEffect(() => {
    if (highlightId) {
      setExpandedId(highlightId);
      loadNotes(highlightId);
    }
  }, [highlightId]);

  const toggleExpand = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    const req = requests.find((r) => r.id === id);
    if (req?.requestedAmount != null) {
      setApproveAmounts((prev) => ({
        ...prev,
        [id]: prev[id] ?? String(req.requestedAmount),
      }));
    }
    if (!threadNotes[id]) await loadNotes(id);
  };

  const submitRequest = async () => {
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      await api.post('/fund-requests', {
        requestedAmount: Number(amount),
        notes: notes || undefined,
      });
      setMessage('Fund request submitted — admins notified');
      setNotes('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const acceptRequest = async (id) => {
    try {
      await api.post(`/fund-requests/${id}/accept`);
      setMessage('Funds accepted');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const approveRequest = async (id, approvedAmount) => {
    const note = replyText[id]?.trim();
    if (!approvedAmount || approvedAmount <= 0) {
      setError('Enter a valid approved amount');
      return;
    }
    try {
      await api.post(`/fund-requests/${id}/approve`, {
        approvedAmount,
        notes: note || undefined,
      });
      setMessage('Request approved — requester notified of approved amount');
      setReplyText((prev) => ({ ...prev, [id]: '' }));
      load();
      loadNotes(id);
    } catch (err) {
      setError(err.message);
    }
  };

  const rejectRequest = async (id) => {
    const reason = replyText[id]?.trim();
    if (!reason || reason.length < 3) {
      setError('Add a rejection reason in the note field (min 3 characters)');
      return;
    }
    try {
      await api.post(`/fund-requests/${id}/reject`, { reason });
      setMessage('Request rejected — requester notified');
      setReplyText((prev) => ({ ...prev, [id]: '' }));
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const disputeRequest = async (id) => {
    const reason = replyText[id]?.trim();
    if (!reason || reason.length < 3) {
      setError('Add a dispute reason in the note field (min 3 characters)');
      return;
    }
    try {
      await api.post(`/fund-requests/${id}/dispute`, { reason });
      setMessage('Dispute submitted — admins notified');
      setReplyText((prev) => ({ ...prev, [id]: '' }));
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const addNote = async (id) => {
    const body = replyText[id]?.trim();
    if (!body) return;
    try {
      await api.post(`/fund-requests/${id}/notes`, { body });
      setReplyText((prev) => ({ ...prev, [id]: '' }));
      setMessage('Note sent');
      loadNotes(id);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <LoadingView label="Loading fund requests..." />;

  return (
    <ScreenLayout
      title="Fund Requests"
      subtitle={isAdmin ? 'Review and approve' : 'Request organization funds'}
      headerDark
      showNotifications
      onNotificationsPress={() => navigation.navigate('Notifications')}
      edges={[]}
      keyboard
    >
      <ErrorBanner message={error} />
      <SuccessBanner message={message} />

      {!isAdmin && calculation ? (
        <View style={styles.stats}>
          <StatCard
            label="Fund Needed"
            value={`₹${(calculation.fundNeeded ?? 0).toLocaleString()}`}
            icon="cash-outline"
            tone="warning"
          />
          <StatCard
            label="Workers"
            value={String(calculation.workerCount ?? 0)}
            icon="people-outline"
            tone="brand"
          />
        </View>
      ) : null}

      {!isAdmin ? (
        <Card style={styles.formCard} elevated>
          <SectionTitle title="New request" />
          <InputField
            label="Requested amount"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="0"
          />
          <InputField
            label="Note to admin"
            value={notes}
            onChangeText={setNotes}
            placeholder="Explain why you need these funds..."
            multiline
          />
          <PrimaryButton title="Submit Request" onPress={submitRequest} loading={submitting} icon="send-outline" />
        </Card>
      ) : null}

      <SectionTitle title={`Requests (${requests.length})`} />
      {requests.map((req) => (
        <FundRequestCard
          key={req.id}
          req={req}
          isAdmin={isAdmin}
          expanded={expandedId === req.id}
          onToggle={() => toggleExpand(req.id)}
          onAccept={acceptRequest}
          onApprove={approveRequest}
          onReject={rejectRequest}
          onDispute={disputeRequest}
          onAddNote={() => addNote(req.id)}
          noteText={replyText[req.id] || ''}
          onNoteTextChange={(text) => setReplyText((prev) => ({ ...prev, [req.id]: text }))}
          notes={threadNotes[req.id] || []}
          loadingNotes={loadingNotes && expandedId === req.id}
          approveAmount={approveAmounts[req.id] ?? String(req.requestedAmount ?? '')}
          onApproveAmountChange={(text) =>
            setApproveAmounts((prev) => ({ ...prev, [req.id]: text }))
          }
        />
      ))}
      {!requests.length ? <Text style={styles.empty}>No fund requests yet</Text> : null}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  formCard: { gap: spacing.md },
  card: { marginBottom: spacing.sm },
  cardExpanded: { borderColor: colors.primaryLight },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  cardMeta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  inlineNote: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.sm, fontStyle: 'italic' },
  inlineApproved: { fontSize: 13, color: colors.primary, marginTop: spacing.sm, fontWeight: '600' },
  inlineReject: { fontSize: 13, color: colors.danger, marginTop: spacing.sm, fontWeight: '500' },
  expanded: { marginTop: spacing.md, gap: spacing.sm },
  notesTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noteBubble: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  noteAuthor: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  noteBody: { fontSize: 14, color: colors.text, marginTop: 4, lineHeight: 20 },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  empty: { textAlign: 'center', color: colors.textMuted, padding: spacing.lg },
});
