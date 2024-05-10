use anchor_lang::error_code;

#[error_code]
pub enum KyuPadError {
    #[msg("This wallet is't supported to mint")]
    InvalidWallet,

    PublicKeyMismatch,

    IncorrectOwner,

    #[msg("Mint time is too early or expired")]
    NotInvestTime,

    #[msg("Projet is out of tickets to buy")]
    ProjectOutOfTicket,

    #[msg("Invest total is invalid")]
    InvalidTotalInvestment,

    #[msg("Not enough tickets")]
    NotEnoughTicket,

    NeedToPassMintDecimals,
}
