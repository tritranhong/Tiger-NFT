
use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::{LookupMap, TreeMap, UnorderedSet};
use near_sdk::json_types::{ValidAccountId};
use near_sdk::{
    assert_one_yocto, env, ext_contract, log, AccountId, Balance, Gas,
    IntoStorageKey, PromiseOrValue, PromiseResult, StorageUsage,
};
use std::collections::HashMap;

//////////////////////////////////////////////

use crate::*;

const GAS_FOR_RESOLVE_TRANSFER: Gas = 10_000_000_000_000;
const GAS_FOR_NFT_TRANSFER_CALL: Gas = 25_000_000_000_000 + GAS_FOR_RESOLVE_TRANSFER;
const NO_DEPOSIT: Balance = 0;

#[derive(BorshDeserialize, BorshSerialize)]
pub struct NonFungibleToken {
    // owner of contract; this is the only account allowed to call `mint`
    pub owner_id: AccountId,

    // The storage size in bytes for each new token
    pub extra_storage_in_bytes_per_token: StorageUsage,

    // always required
    pub owner_by_id: TreeMap<TokenId, AccountId>,

    // required by metadata extension
    pub token_metadata_by_id: Option<LookupMap<TokenId, TokenMetadata>>,

    // required by enumeration extension
    pub tokens_per_owner: Option<LookupMap<AccountId, UnorderedSet<TokenId>>>,

    // required by approval extension
    pub approvals_by_id: Option<LookupMap<TokenId, HashMap<AccountId, u64>>>,
    pub next_approval_id_by_id: Option<LookupMap<TokenId, u64>>,
}

// #[derive(BorshStorageKey, BorshSerialize)]
// pub enum StorageKey {
//     TokensPerOwner { account_hash: Vec<u8> },
//     TokenPerOwnerInner { account_id_hash: CryptoHash },
// }
impl NonFungibleToken {
    pub fn new<Q, R, S, T>(
        owner_by_id_prefix: Q,
        owner_id: ValidAccountId,
        token_metadata_prefix: Option<R>,
        enumeration_prefix: Option<S>,
        approval_prefix: Option<T>,
    ) -> Self
    where
        Q: IntoStorageKey,
        R: IntoStorageKey,
        S: IntoStorageKey,
        T: IntoStorageKey,
    {
        let (approvals_by_id, next_approval_id_by_id) = if let Some(prefix) = approval_prefix {
            let prefix: Vec<u8> = prefix.into_storage_key();
            (
                Some(LookupMap::new(prefix.clone())),
                Some(LookupMap::new([prefix, "n".into()].concat())),
            )
        } else {
            (None, None)
        };

        let this = Self {
            owner_id: owner_id.into(),
            extra_storage_in_bytes_per_token: 0,
            owner_by_id: TreeMap::new(owner_by_id_prefix),
            token_metadata_by_id: token_metadata_prefix.map(LookupMap::new),
            tokens_per_owner: enumeration_prefix.map(LookupMap::new),
            approvals_by_id,
            next_approval_id_by_id,
        };    
        this
    }

    /// Transfer token_id from `from` to `to`
    ///
    /// Do not perform any safety checks or do any logging
    /// Transfer from current owner to receiver_id, checking that sender is allowed to transfer.
    /// Clear approvals, if approval extension being used.
    /// Return previous owner and approvals.
    pub fn internal_transfer(
        &mut self,
        sender_id: &AccountId,
        receiver_id: &AccountId,
        token_id: &TokenId,
        approval_id: Option<u64>,
        memo: Option<String>,
    ) -> (AccountId, Option<HashMap<AccountId, u64>>) {
        let owner_id = self.owner_by_id.get(token_id).expect("Token not found");

        // clear approvals, if using Approval Management extension
        // this will be rolled back by a panic if sending fails
        let approved_account_ids =
            self.approvals_by_id.as_mut().and_then(|by_id| by_id.remove(&token_id));

        // check if authorized
        if sender_id != &owner_id {
            // if approval extension is NOT being used, or if token has no approved accounts
            if approved_account_ids.is_none() {
                env::panic(b"Unauthorized")
            }

            // Approval extension is being used; get approval_id for sender.
            let actual_approval_id = approved_account_ids.as_ref().unwrap().get(sender_id);

            // Panic if sender not approved at all
            if actual_approval_id.is_none() {
                env::panic(b"Sender not approved");
            }

            // If approval_id included, check that it matches
            if let Some(enforced_approval_id) = approval_id {
                let actual_approval_id = actual_approval_id.unwrap();
                assert_eq!(
                    actual_approval_id, &enforced_approval_id,
                    "The actual approval_id {} is different from the given approval_id {}",
                    actual_approval_id, enforced_approval_id,
                );
            }
        }

        assert_ne!(&owner_id, receiver_id, "Current and next owner must differ");

        log!("Transfer {} from {} to {}", token_id, sender_id, receiver_id);
        if let Some(memo) = memo {
            log!("Memo: {}", memo);
        }

        // return previous owner & approvals
        (owner_id, approved_account_ids)
    }
}

pub trait NonFungibleTokenCore {
    fn nft_transfer(&mut self, receiver_id: AccountId, token_id: TokenId, approval_id: u64, memo: Option<String>);

    // return true nếu transfer NFT được thực hiện thành công
    fn nft_transfer_call(&mut self, receiver_id: AccountId, token_id: TokenId, approval_id: u64, memo: Option<String>, msg: String) -> PromiseOrValue<bool>;
}

#[ext_contract(ext_non_fungible_token_receiver)]
trait NonFungibleTokenReceiver {
    // Method lưu trên Contract B, A thực cross contract call nft_on_transfer
    // return true nếu như NFT cần được rollback lại cho owner cũ
    fn nft_on_transfer(&mut self, sender_id: AccountId, previous_owner_id: AccountId, token_id: TokenId, msg: String) -> Promise;
}

#[ext_contract(ext_self)]
trait NonFungibleTokenResolver {
    // Nếu contract B yêu cầu rollback lại cho owner cũ => A sẽ rollback lại data trong nft_resolve_transfer
    fn nft_resolve_transfer(
        &mut self, 
        authorized_id: Option<AccountId>,
        owner_id: AccountId, 
        receiver_id: AccountId, 
        token_id: TokenId, 
        approved_account_ids: HashMap<AccountId, u64>,
        memo: Option<String>
    ) -> bool;
}

trait NonFungibleTokenResolver {
    fn nft_resolve_transfer(
        &mut self, 
        authorized_id: Option<AccountId>,
        owner_id: AccountId, 
        receiver_id: AccountId, 
        token_id: TokenId, 
        approved_account_ids: HashMap<AccountId, u64>,
        memo: Option<String>
    ) -> bool;
}
#[near_bindgen]
impl NonFungibleTokenCore for Contract {
    // Yêu cầu deposit 1 yoctoNear để bảo mật cho user
    #[payable]
    fn nft_transfer(&mut self, receiver_id: AccountId, token_id: TokenId, approval_id: u64, memo: Option<String>) {
        assert_one_yocto();
        let sender_id = env::predecessor_account_id();

        let previous_token = self.internal_transfer(
            &sender_id,
            &receiver_id,
            &token_id,
            Some(approval_id),
            memo
        );

        refund_approved_account_ids(sender_id, &previous_token.approved_account_ids);
    }

    #[payable]
    fn nft_transfer_call(&mut self, receiver_id: AccountId , token_id: TokenId, approval_id: u64, memo: Option<String>, msg: String) -> PromiseOrValue<bool> {
        assert_one_yocto();
        let sender_id = env::predecessor_account_id();

        let previous_token = self.internal_transfer(
            &sender_id,
            &receiver_id,
            &token_id,
            Some(approval_id),
            memo.clone()
        );

        let mut authorized_id = None;
        if sender_id != previous_token.owner_id {
            authorized_id = Some(sender_id.to_string());
        }

        ext_non_fungible_token_receiver::nft_on_transfer(
            sender_id.clone(), 
            previous_token.owner_id.clone(), 
            token_id.clone(), 
            msg, 
            &receiver_id, 
            NO_DEPOSIT, 
            env::prepaid_gas() - GAS_FOR_NFT_TRANSFER_CALL
        ).then(ext_self::nft_resolve_transfer(
            authorized_id,
            previous_token.owner_id, 
            receiver_id, 
            token_id, 
            previous_token.approved_account_ids,
            memo,
            &env::current_account_id(), 
            NO_DEPOSIT, 
        GAS_FOR_RESOLVE_TRANSFER
        )).into()
    }
}

#[near_bindgen]
impl NonFungibleTokenResolver for Contract {
    fn nft_resolve_transfer(
        &mut self,
        authorized_id: Option<AccountId>,
         owner_id: AccountId, 
         receiver_id: AccountId, 
         token_id: TokenId, 
         approved_account_ids: HashMap<AccountId, u64>, 
         memo: Option<String>
        ) -> bool {
        if let PromiseResult::Successful(value) = env::promise_result(0) {
            if let Ok(is_rollback_token) = near_sdk::serde_json::from_slice::<bool>(&value) {
                return !is_rollback_token;
            }
        }

        let mut token = if let Some(token) = self.tokens_by_id.get(&token_id) {
            if token.owner_id != receiver_id {

                refund_approved_account_ids(owner_id, &approved_account_ids);
                return true;
            }
            token
        } else {
            refund_approved_account_ids(owner_id, &approved_account_ids);
            return true;
        };

        log!("Rollback {} from @{} to @{}", token_id, receiver_id, owner_id);
    
        self.internal_remove_token_from_owner(&token_id, &receiver_id);
        self.internal_add_token_to_owner(&token_id, &owner_id);

        token.owner_id = owner_id.clone();

        refund_approved_account_ids(receiver_id.clone(), &token.approved_account_ids);
        token.approved_account_ids = approved_account_ids;

        self.tokens_by_id.insert(&token_id, &token);

        // NFT TRANSFER LOG
        let nft_transfer_log = EventLog {
            standard: "nep171".to_string(),
            version: "1.0.0".to_string(),
            event: EventLogVariant::NftTransfer(vec![ NftTransferLog {
                authorized_id,
                old_owner_id: receiver_id.to_string(),
                new_owner_id: owner_id.to_string(),
                token_ids: vec![token_id.to_string()],
                memo
            } ])
        };

        env::log(&nft_transfer_log.to_string().as_bytes());

        false
    }
}