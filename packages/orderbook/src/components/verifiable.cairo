#[starknet::component]
pub mod VerifiableComponent {
    // Starknet imports

    use starknet::ContractAddress;

    // External imports

    use openzeppelin_introspection::interface::{ISRC5Dispatcher, ISRC5DispatcherTrait};
    use openzeppelin_token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    use openzeppelin_token::erc721::interface::{
        IERC721_ID, IERC721Dispatcher, IERC721DispatcherTrait,
    };
    use openzeppelin_token::erc1155::interface::{
        IERC1155_ID, IERC1155Dispatcher, IERC1155DispatcherTrait,
    };
    use openzeppelin_token::common::erc2981::interface::{
        IERC2981_ID, IERC2981Dispatcher, IERC2981DispatcherTrait,
    };

    // Errors

    pub mod errors {
        pub const VERIFIABLE_INVALID_COLLECTION: felt252 = 'Verifiable: invalid collection';
        pub const VERIFIABLE_NOT_OWNER: felt252 = 'Verifiable: not owner';
        pub const VERIFIABLE_NOT_APPROVED: felt252 = 'Verifiable: not approved';
        pub const VERIFIABLE_INVALID_BALANCE: felt252 = 'Verifiable: invalid balance';
        pub const VERIFIABLE_NOT_INVALID: felt252 = 'Verifiable: not invalid';
        pub const VERIFIABLE_INVALID_VALUE: felt252 = 'Verifiable: invalid value';
    }

    // Storage

    #[storage]
    pub struct Storage {}

    // Events

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {}

    #[generate_trait]
    pub impl InternalImpl<
        TContractState, +HasComponent<TContractState>,
    > of InternalTrait<TContractState> {
        #[inline]
        fn transfer(
            self: @ComponentState<TContractState>,
            owner: ContractAddress,
            collection: ContractAddress,
            token_id: u256,
            value: u256,
            recipient: ContractAddress,
        ) {
            let data: Span<felt252> = array![].span();
            let src5_dispatcher = ISRC5Dispatcher { contract_address: collection };
            if src5_dispatcher.supports_interface(IERC1155_ID) {
                // [Interaction] ERC1155 transfer
                let collection_dispatcher = IERC1155Dispatcher { contract_address: collection };
                collection_dispatcher
                    .safe_transfer_from(
                        from: owner, to: recipient, token_id: token_id, value: value, data: data,
                    );
            } else if src5_dispatcher.supports_interface(IERC721_ID) {
                // [Interaction] ERC721 transfer
                let collection_dispatcher = IERC721Dispatcher { contract_address: collection };
                collection_dispatcher
                    .safe_transfer_from(from: owner, to: recipient, token_id: token_id, data: data);
            } else {
                // [Panic] Unsupported collection
                assert(false, errors::VERIFIABLE_INVALID_COLLECTION);
            }
        }

        #[inline]
        fn pay(
            self: @ComponentState<TContractState>,
            spender: ContractAddress,
            recipient: ContractAddress,
            currency: ContractAddress,
            amount: u256,
        ) {
            // [Check] Skip if amount is zero
            if amount == 0 {
                return;
            }
            let currency_dispatcher = IERC20Dispatcher { contract_address: currency };
            let caller = starknet::get_caller_address();
            if caller == spender {
                // [Interaction] ERC20 transfer
                currency_dispatcher.transfer(recipient: recipient, amount: amount);
                return;
            }
            // [Interaction] ERC20 transfer from
            currency_dispatcher
                .transfer_from(sender: spender, recipient: recipient, amount: amount);
        }

        #[inline]
        fn royalties(
            self: @ComponentState<TContractState>,
            collection: ContractAddress,
            token_id: u256,
            sale_price: u256,
        ) -> (ContractAddress, u256) {
            let src5_dispatcher = ISRC5Dispatcher { contract_address: collection };
            if src5_dispatcher.supports_interface(IERC2981_ID) {
                // [Interaction] ERC2981 royalty
                let collection_dispatcher = IERC2981Dispatcher { contract_address: collection };
                return collection_dispatcher.royalty_info(token_id, sale_price);
            };
            // [Fallback] No royalties
            (starknet::get_contract_address(), 0)
        }

        #[inline]
        fn assert_sell_validity(
            self: @ComponentState<TContractState>,
            owner: ContractAddress,
            collection: ContractAddress,
            token_id: u256,
            value: u256,
        ) {
            let src5_dispatcher = ISRC5Dispatcher { contract_address: collection };
            if src5_dispatcher.supports_interface(IERC1155_ID) {
                // [Check] ERC1155 requirements
                let collection_dispatcher = IERC1155Dispatcher { contract_address: collection };
                let is_approved = ERC1155Impl::operator_is_approved(
                    self: self, collection: collection_dispatcher, owner: owner, token_id: token_id,
                );
                assert(is_approved, errors::VERIFIABLE_NOT_APPROVED);
                let has_enough_balance = ERC1155Impl::has_enough_balance(
                    self: self,
                    collection: collection_dispatcher,
                    account: owner,
                    token_id: token_id,
                    value: value,
                );
                assert(has_enough_balance, errors::VERIFIABLE_INVALID_BALANCE);
            } else if src5_dispatcher.supports_interface(IERC721_ID) {
                // [Check] ERC721 requirements
                let collection_dispatcher = IERC721Dispatcher { contract_address: collection };
                let is_approved = ERC721Impl::operator_is_approved(
                    self: self, collection: collection_dispatcher, owner: owner, token_id: token_id,
                );
                assert(is_approved, errors::VERIFIABLE_NOT_APPROVED);
                let is_owner = ERC721Impl::is_token_owner(
                    self: self,
                    collection: collection_dispatcher,
                    account: owner,
                    token_id: token_id,
                );
                assert(is_owner, errors::VERIFIABLE_NOT_OWNER);
                assert(value == 0, errors::VERIFIABLE_INVALID_VALUE);
            } else {
                // [Panic] Unsupported collection
                assert(false, errors::VERIFIABLE_INVALID_COLLECTION);
            };
        }

        #[inline]
        fn assert_sell_invalidity(
            self: @ComponentState<TContractState>,
            owner: ContractAddress,
            expiration: u64,
            collection: ContractAddress,
            token_id: u256,
            value: u256,
        ) {
            let has_expired = expiration < starknet::get_block_timestamp();
            let src5_dispatcher = ISRC5Dispatcher { contract_address: collection };
            if src5_dispatcher.supports_interface(IERC1155_ID) {
                // [Check] ERC1155 requirements
                let collection_dispatcher = IERC1155Dispatcher { contract_address: collection };
                let is_approved = ERC1155Impl::operator_is_approved(
                    self: self, collection: collection_dispatcher, owner: owner, token_id: token_id,
                );
                let has_enough_balance = ERC1155Impl::has_enough_balance(
                    self: self,
                    collection: collection_dispatcher,
                    account: owner,
                    token_id: token_id,
                    value: value,
                );
                assert(
                    has_expired || !is_approved || !has_enough_balance,
                    errors::VERIFIABLE_NOT_INVALID,
                );
            } else if src5_dispatcher.supports_interface(IERC721_ID) {
                // [Check] ERC721 requirements
                let collection_dispatcher = IERC721Dispatcher { contract_address: collection };
                let is_approved = ERC721Impl::operator_is_approved(
                    self: self, collection: collection_dispatcher, owner: owner, token_id: token_id,
                );
                assert(is_approved, errors::VERIFIABLE_NOT_APPROVED);
                let is_owner = ERC721Impl::is_token_owner(
                    self: self,
                    collection: collection_dispatcher,
                    account: owner,
                    token_id: token_id,
                );
                assert(
                    has_expired || !is_owner || !is_approved || value != 0,
                    errors::VERIFIABLE_NOT_INVALID,
                );
            }
            // [Fallback] Unsupported collection is considered as inactive
        }

        #[inline]
        fn assert_buy_validity(
            self: @ComponentState<TContractState>,
            owner: ContractAddress,
            currency: ContractAddress,
            price: u256,
        ) {
            let erc20_dispatcher = IERC20Dispatcher { contract_address: currency };
            let has_enough_balance = ERC20Impl::has_enough_balance(
                self: self, currency: erc20_dispatcher, account: owner, amount: price,
            );
            assert(has_enough_balance, errors::VERIFIABLE_INVALID_BALANCE);
            let spender_is_allowed = ERC20Impl::spender_is_allowed(
                self: self, currency: erc20_dispatcher, owner: owner, amount: price,
            );
            assert(spender_is_allowed, errors::VERIFIABLE_NOT_APPROVED);
        }

        #[inline]
        fn assert_buy_invalidity(
            self: @ComponentState<TContractState>,
            owner: ContractAddress,
            expiration: u64,
            currency: ContractAddress,
            price: u256,
        ) {
            let has_expired = expiration < starknet::get_block_timestamp();
            let erc20_dispatcher = IERC20Dispatcher { contract_address: currency };
            let has_enough_balance = ERC20Impl::has_enough_balance(
                self: self, currency: erc20_dispatcher, account: owner, amount: price,
            );
            let spender_is_allowed = ERC20Impl::spender_is_allowed(
                self: self, currency: erc20_dispatcher, owner: owner, amount: price,
            );
            assert(
                has_expired || !has_enough_balance || !spender_is_allowed,
                errors::VERIFIABLE_NOT_INVALID,
            );
        }
    }

    #[generate_trait]
    pub impl SRC5Impl<TContractState, +HasComponent<TContractState>> of SRC5Trait<TContractState> {
        #[inline]
        fn supports_interface(
            self: @ComponentState<TContractState>,
            collection: ISRC5Dispatcher,
            interface_id: felt252,
        ) -> bool {
            collection.supports_interface(interface_id)
        }
    }

    #[generate_trait]
    pub impl ERC20Impl<
        TContractState, +HasComponent<TContractState>,
    > of ERC20Trait<TContractState> {
        #[inline]
        fn spender_is_allowed(
            self: @ComponentState<TContractState>,
            currency: IERC20Dispatcher,
            owner: ContractAddress,
            amount: u256,
        ) -> bool {
            let spender = starknet::get_caller_address();
            owner == spender || currency.allowance(owner, spender) >= amount
        }

        #[inline]
        fn has_enough_balance(
            self: @ComponentState<TContractState>,
            currency: IERC20Dispatcher,
            account: ContractAddress,
            amount: u256,
        ) -> bool {
            currency.balance_of(account) >= amount
        }
    }

    #[generate_trait]
    pub impl ERC721Impl<
        TContractState, +HasComponent<TContractState>,
    > of ERC721Trait<TContractState> {
        #[inline]
        fn operator_is_approved(
            self: @ComponentState<TContractState>,
            collection: IERC721Dispatcher,
            owner: ContractAddress,
            token_id: u256,
        ) -> bool {
            let operator = starknet::get_contract_address();
            collection.is_approved_for_all(owner, operator)
        }

        #[inline]
        fn is_token_owner(
            self: @ComponentState<TContractState>,
            collection: IERC721Dispatcher,
            account: ContractAddress,
            token_id: u256,
        ) -> bool {
            collection.owner_of(token_id) == account
        }
    }

    #[generate_trait]
    pub impl ERC1155Impl<
        TContractState, +HasComponent<TContractState>,
    > of ERC1155Trait<TContractState> {
        #[inline]
        fn operator_is_approved(
            self: @ComponentState<TContractState>,
            collection: IERC1155Dispatcher,
            owner: ContractAddress,
            token_id: u256,
        ) -> bool {
            let operator = starknet::get_contract_address();
            collection.is_approved_for_all(owner, operator)
        }

        #[inline]
        fn has_enough_balance(
            self: @ComponentState<TContractState>,
            collection: IERC1155Dispatcher,
            account: ContractAddress,
            token_id: u256,
            value: u256,
        ) -> bool {
            collection.balance_of(account, token_id) >= value
        }
    }

    #[generate_trait]
    pub impl ERC2981Impl<
        TContractState, +HasComponent<TContractState>,
    > of ERC2981Trait<TContractState> {
        #[inline]
        fn royalty_info(
            self: @ComponentState<TContractState>,
            collection: IERC2981Dispatcher,
            token_id: u256,
            sale_price: u256,
        ) -> (ContractAddress, u256) {
            collection.royalty_info(token_id, sale_price)
        }
    }
}
