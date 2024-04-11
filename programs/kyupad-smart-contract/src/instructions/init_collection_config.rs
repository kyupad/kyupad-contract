use anchor_lang::prelude::*;

use crate::{state::{BpfWriter, PoolConfig}, utils::create_account, ID};

pub fn init_collection_config<'c: 'info, 'info>(    
    ctx: Context<'_, '_, 'c, 'info, InitCollectionConfig<'info>>,
    vec_pools_args: Vec<PoolConfigArgs>,
) -> Result<()> {
    let mut vec_pools: Vec<PoolConfig> = vec![];
    let collection_mint = &ctx.accounts.collection_mint;
    let pools = &mut ctx.accounts.pools;
    let system_program = &ctx.accounts.system_program;
    let creator = &ctx.accounts.creator;
     
    let remaining_accounts_iter = &mut ctx.remaining_accounts.iter();
    for pca in vec_pools_args.iter() {
       let new_group_config = PoolConfig {
            id: pca.id.clone(),
            start_date: pca.start_date,
            end_date: pca.end_date,
            merkle_root: pca.merkle_root.clone(), 
            total_mint_per_wallet: pca.total_mint_per_wallet,
            destination: collection_mint.key.clone(),
            payment: pca.payment,
            box_tax: pca.box_tax,
            pool_supply: pca.pool_supply,
            lamports: pca.lamports
        };

        PoolMinted::initialize(creator.to_account_info(), pools.to_account_info(), next_account_info(remaining_accounts_iter)?, system_program.to_account_info(), pca.merkle_root.clone(), pca.pool_supply)?;
        
        vec_pools.push(new_group_config);
    }
    pools.collection_mint = collection_mint.key.clone();
    pools.pools_config = vec_pools;
    Ok(())
}

#[derive(Accounts)]
#[instruction()]
pub struct InitCollectionConfig<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    /// CHECK:
    pub collection_mint: AccountInfo<'info>,

    #[account(
        init_if_needed,
        payer = creator, 
        space = 8 + Pools::INIT_SPACE, 
        seeds=[b"pools", creator.key().as_ref(), collection_mint.key.as_ref()], 
        bump
    )]
    pub pools: Account<'info, Pools>,

    pub system_program: Program<'info, System>,
}

#[account]
#[derive(Debug, InitSpace)]
pub struct Pools {
    pub collection_mint: Pubkey,
    #[max_len(5)]
    pub author: Vec<Pubkey>,
    #[max_len(10)]
    pub pools_config: Vec<PoolConfig>,
}

impl Pools {
    pub const PREFIX_SEED: &'static [u8; 5] = b"pools";
    
}

#[derive(Debug, AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PoolConfigArgs {
    id: String,
    start_date: u64,
    end_date: u64,
    merkle_root: Vec<u8>,
    total_mint_per_wallet: u8,
    payment: u64,
    box_tax: Option<f32>,
    pool_supply: u16,
    lamports: u64,
}

#[account]
#[derive(Debug)]
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
        tmp_group_data: &'info AccountInfo<'info>,
        system_program: AccountInfo<'info>,
        merkle_root: Vec<u8>,
        remaining_assets: u16,
    ) -> Result<()> {
        let seeds: &[&[u8]] = &[Self::PREFIX_SEED, pools.key.as_ref(), merkle_root.as_ref()];

        let (_, bump) = Pubkey::find_program_address(seeds, &ID);
        let space: u64 =  (8 + 2 + (4 + 33 * remaining_assets)).into();

        create_account(system_program, payer.clone(), tmp_group_data.clone(), seeds, bump, space, &ID)?;

        let mut tmp_group_data_ser = PoolMinted::from(&tmp_group_data);
        tmp_group_data_ser.create(remaining_assets)?;

        tmp_group_data_ser.serialize(tmp_group_data.to_account_info())?;
        Ok(())
    }
}