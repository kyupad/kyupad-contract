use anchor_lang::error_code;

#[error_code]
pub enum KyuPadError {
    #[msg("Could not save guard to account")]
    InvalidAccountSize,

    #[msg("This wallet is't supported to mint")]
    InvalidWallet,

    #[msg("The merkle root is invalid")]
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

    #[msg("This signer is now allow to init another signer")]
    InvalidSigner,

    #[msg("Error unknown")]
    ErrorUnknown,

    #[msg("Your pool id doesn't in pools config")]
    PoolIdInvalid,

    #[msg("Invalid merkle root")]
    InvalidMerkeRoot,

    #[msg("Dont have right to do this action")]
    DontHaveRight,

    #[msg("The investment is reach limit")]
    AllowedInvestLimitReached,
}
