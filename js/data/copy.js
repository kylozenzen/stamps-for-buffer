'use strict';

window.RECEIPTS_COPY = {
  portal: {
    headerBadge:       'Shared Review',
    subhead:           'Anyone with this link can comment. Only the designated approver can send the official decision back to the creator.',
    approverTitle:     'Designated Approver',
    officialTitle:     'Official send-back',
    officialHelp:      'Restricted to the designated approver. Final approval or change requests require email verification.',
    teamFeedbackTitle: 'Team feedback',
    teamFeedbackHelp:  'Anyone with the link can leave comments for the creator to review.',
    leaveComment:      'Add team comment',
    officialChanges:   'Send official changes',
    officialApprove:   'Send official approval',
    verifyTitle:       'Verify final sign-off',
    verifyText:        "We'll send a 6-digit code to the designated approver email before the official response is sent.",
    demoCodeLabel:     'Demo code',
    demoCode:          '424242',
    codePlaceholder:   'Enter 6-digit code',
    submitCode:        'Verify & continue',
    approvedToast:     'Official approval sent to creator.',
    changesToast:      'Official change request sent to creator.',
    commentToast:      'Team comment added.'
  },
  common: {
    comingSoon:       'Coming Soon',
    vaultSoonTitle:   'The Vault',
    vaultSoonBody:    'Every approved piece generates a signed Certificate of Approval with timestamp, revision history, and an immutable record.'
  }
};

function getCopy(path, fallback) {
  try {
    return path.split('.').reduce(function(acc, key) {
      return acc && acc[key];
    }, window.RECEIPTS_COPY) || fallback;
  } catch(e) { return fallback; }
}

window.getCopy = getCopy;
