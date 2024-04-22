use anchor_lang::error_code;

#[error_code]
pub enum KyuPadError {
    #[msg("Could not save guard to account")]
    InvalidAccountSize,

    #[msg("This wallet is't supported to mint")]
    InvalidWallet,

    #[msg("The merkle root input not in the groups config")]
    InvalidMekleRoot,

    #[msg("Pool's supply has run out")]
    PoolSupplyRunOut,

    #[msg("Not enough sol to mint")]
    NotEnoughSOL,

    PublicKeyMismatch,

    IncorrectOwner,

    AllowedMintLimitReached,

    #[msg("Mint time is too early or expired")]
    NotMintTime,

    #[msg("This pool config is already in pools")]
    CannotAddPoolConfig,

    #[msg("This destination address doesn't not match with pools config")]
    DestinationIsInvalid,
}
