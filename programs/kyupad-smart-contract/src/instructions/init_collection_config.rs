use anchor_lang::prelude::*;

use crate::{state::{BpfWriter, PoolConfig}, utils::{assert_keys_equal, create_account}, Admin, ID};


pub fn init_collection_config<'c: 'info, 'info>(    
    ctx: Context<'_, '_, 'c, 'info, InitCollectionConfig<'info>>,
    init_collection_config_args: InitCollectionConfigArgs,
) -> Result<()> {
    
    let collection_mint = &ctx.accounts.collection_mint;
    let pools = &mut ctx.accounts.pools;

    pools.collection_mint = collection_mint.key.clone();
    pools.max_mint_of_wallet = init_collection_config_args.max_mint_of_wallet;
   
    Ok(())
}

#[derive(Accounts)]
#[instruction()]
pub struct InitCollectionConfig<'info> {
    #[account(
        mut,         
        constraint = creator.key() == admin_pda.admin_key
    )]
    pub creator: Signer<'info>,

    #[account(
        seeds=[b"admin", creator.key().as_ref()],
        bump,
        owner = ID,
    )]
    pub admin_pda: Account<'info, Admin>,

    /// CHECK:
    pub collection_mint: AccountInfo<'info>,

    #[account(
        init,
        payer = creator, 
        space = 8 + Pools::INIT_SPACE, 
        seeds=[b"pools", collection_mint.key.as_ref()], 
        bump
    )]
    pub pools: Account<'info, Pools>,

    pub system_program: Program<'info, System>,
}

#[derive(Debug, AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitCollectionConfigArgs {
    pub max_mint_of_wallet: u8,
}

#[account]
#[derive(Debug, InitSpace)]
pub struct Pools {
    pub collection_mint: Pubkey,

    #[max_len(50)]
    pub pools_config: Vec<PoolConfig>,

    pub max_mint_of_wallet: u8,
}

impl Pools {
    pub const PREFIX_SEED: &'static [u8; 5] = b"pools";
    pub const HAHA: usize = Pools::INIT_SPACE;    
}

#[derive(Debug, AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PoolConfigArgs {
    pub id: String,
    pub start_date: i64,
    pub end_date: i64,
    pub merkle_root: Vec<u8>,
    pub total_mint_per_wallet: u8,
    pub payment: f32,
    pub pool_supply: u16,
    pub exclusion_pools: Option<Vec<String>>,
}

#[account]
#[derive(Debug, InitSpace)]
pub struct PoolMinted {
    pub remaining_assets: u16,
}

impl PoolMinted {
    pub const PREFIX_SEED: &'static [u8; 11] = b"pool_minted";

    fn from<'info>(x: &'info AccountInfo<'info>) -> Account<'info, Self> {
        Account::try_from_unchecked(x).unwrap()
    }

    pub fn serialize(&self, info: AccountInfo) -> Result<()> {
        let dst: &mut [u8] = &mut info.try_borrow_mut_data().unwrap();
        let mut writer: BpfWriter<&mut [u8]> = BpfWriter::new(dst);
        PoolMinted::try_serialize(self, &mut writer)
    }

    pub fn create(&mut self, remaining_assets: u16) -> Result<()> {
        self.remaining_assets = remaining_assets;
        Ok(())
    }

    pub fn initialize<'info>(
        payer: AccountInfo<'info>,
        pools: AccountInfo<'info>,
        pool_minted_account: &'info AccountInfo<'info>,
        system_program: AccountInfo<'info>,
        id: String,
        remaining_assets: u16,
    ) -> Result<()> {
        let seeds: &[&[u8]] = &[Self::PREFIX_SEED, pools.key.as_ref(), id.as_bytes()];

        let (pda, bump) = Pubkey::find_program_address(seeds, &ID);

        assert_keys_equal(&pda, &pool_minted_account.key)?;

        let space: u64 = (8 + PoolMinted::INIT_SPACE).try_into().unwrap();

        create_account(system_program, payer.clone(), pool_minted_account.clone(), seeds, bump, space, &ID)?;

        let mut pool_minted_account_ser = PoolMinted::from(&pool_minted_account);
        pool_minted_account_ser.create(remaining_assets)?;

        pool_minted_account_ser.serialize(pool_minted_account_ser.to_account_info())?;
        Ok(())
    }
}