use anchor_lang::error_code;

#[error_code]
pub enum KyuPadError {
    #[msg("This wallet is't supported to mint")]
    InvalidWallet,

    #[msg("The publicKey provide doesn't match with config publicKey")]
    PublicKeyMismatch,

    #[msg("Invest time is too early or expired")]
    NotInvestTime,

    #[msg("Projet is out of tickets to buy")]
    ProjectOutOfTicket,

    #[msg("Invest total is invalid")]
    InvalidTotalInvestment,

    #[msg("Not enough tickets")]
    NotEnoughTicket,

    #[msg("Transfer instruction is error")]
    TransferIsError,
}
