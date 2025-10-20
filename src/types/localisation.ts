export type LocalisationKeys =
  // chain
  | 'chain.all.label'
  // wallet
  | 'wallet.recipient.placeholder'
  | 'wallet.recipient.info.selectToken'
  | 'wallet.recipient.error.noAddress'
  | 'wallet.recipient.error.tokenNotSelected'
  | 'wallet.recipient.error.invalidAddress'
  | 'wallet.recipient.warn.compatibleNetwork'
  | 'wallet.recipient.message.networkVerified'
  | 'wallet.recipient.message.receiveFunds'
  | 'wallet.connected.error.notSupportedChain'
  // transfer
  | 'transfer.success.hash.label'
  | 'transfer.success.intent.label'
  // quote
  | 'quote.result.maxSlippage.label'
  | 'quote.result.processingTime.label'
  // tokens
  | 'tokens.input.max.label'
  | 'tokens.input.half.label'
  | 'tokens.input.externalBalance.label'
  | 'tokens.list.noBalanceOnApp.label'
  | 'tokens.list.searchEmpty.label'
  | 'tokens.list.searchReset.label'
  // deposit
  | 'deposit.external.error.noStatus'
  | 'deposit.external.error.incomplete'
  | 'deposit.external.error.failed'
  | 'deposit.external.loading.waiting'
  | 'deposit.external.loading.fetching'
  // submit - errors
  | 'submit.error.invalidTransferData.label'
  | 'submit.error.transferFailed.label'
  | 'submit.error.insufficientBalance'
  | 'submit.error.invalidAddress'
  | 'submit.error.amountTooLow.label'
  | 'submit.error.amountTooLow.message'
  | 'submit.error.quoteFailed.label'
  | 'submit.error.quoteFailed.message'
  | 'submit.error.transfer.noFees'
  | 'submit.error.transfer.failed'
  // submit - active
  | 'submit.active.transfer'
  | 'submit.active.internal'
  | 'submit.active.external'
  // submit - disabled
  | 'submit.disabled.temporary.label'
  | 'submit.disabled.temporary.message'
  // submit - pending
  | 'submit.pending.quote.finalizing'
  | 'submit.pending.transfer.confirmInWallet'
  | 'submit.pending.transfer.finalizing'
  // wallet compatibility
  | 'walletCompatibility.modal.title.initial'
  | 'walletCompatibility.modal.title.error'
  | 'walletCompatibility.modal.description.initial'
  | 'walletCompatibility.modal.description.error'
  | 'walletCompatibility.modal.feature.secureTransactions'
  | 'walletCompatibility.modal.feature.fullAccess'
  | 'walletCompatibility.modal.feature.fundProtection'
  | 'walletCompatibility.modal.error.interrupted'
  | 'walletCompatibility.modal.error.incompatible'
  | 'walletCompatibility.modal.button.checkCompatibility'
  | 'walletCompatibility.modal.button.tryAgain'
  | 'walletCompatibility.modal.button.signOut';

export type LocalisationDict = Partial<Record<LocalisationKeys, string>>;
