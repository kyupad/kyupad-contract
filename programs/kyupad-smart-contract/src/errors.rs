use anchor_lang::error_code;

#[error_code]
pub enum KyuPadError {
    #[msg("This wallet is't supported to mint")]
    InvalidWallet,

    #[msg("The merkle root is invalid")]
    InvalidMekleRoot,

    #[msg("Pool's supply has run out")]
    PoolSupplyRunOut,

    PublicKeyMismatch,

    IncorrectOwner,

    AllowedMintLimitReached,

    #[msg("Mint time is too early or expired")]
    NotMintTime,

    #[msg("This pool config is already in pools")]
    CannotAddPoolConfig,

    #[msg("This destination address doesn't not match with pools config")]
    DestinationIsInvalid,

    #[msg("Your pool id doesn't in pools config")]
    PoolIdInvalid,
}
