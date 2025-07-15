pub mod setup {
    // Starknet imports

    use starknet::{ContractAddress, SyscallResultTrait};
    use starknet::syscalls::deploy_syscall;

    // Dojo imports

    use dojo::world::{WorldStorage, WorldStorageTrait};
    use dojo_cairo_test::{
        spawn_test_world, NamespaceDef, ContractDef, TestResource, ContractDefTrait,
        WorldStorageTestTrait,
    };

    // External imports

    use openzeppelin_token::erc20::interface::IERC20Dispatcher;
    use openzeppelin_token::erc721::interface::IERC721Dispatcher;
    use openzeppelin_token::erc1155::interface::IERC1155Dispatcher;

    // Packages imports

    use orderbook::events::{index as events};
    use orderbook::models::{index as models};

    // Internal imports

    use marketplace::tests::mocks::account::Account;
    use marketplace::tests::mocks::erc20::ERC20;
    use marketplace::tests::mocks::erc721::ERC721;
    use marketplace::tests::mocks::erc1155::ERC1155;
    use marketplace::systems::marketplace::{Marketplace, IMarketplaceDispatcher};

    // Constant

    pub fn OWNER() -> ContractAddress {
        starknet::contract_address_const::<'OWNER'>()
    }

    pub fn CREATOR() -> ContractAddress {
        starknet::contract_address_const::<'CREATOR'>()
    }

    pub fn CLIENT_RECEIVER() -> ContractAddress {
        starknet::contract_address_const::<'CLIENT_RECEIVER'>()
    }

    pub fn RECEIVER() -> ContractAddress {
        starknet::contract_address_const::<'RECEIVER'>()
    }

    pub fn SPENDER() -> ContractAddress {
        starknet::contract_address_const::<'SPENDER'>()
    }

    pub fn HOLDER() -> ContractAddress {
        starknet::contract_address_const::<'HOLDER'>()
    }

    #[derive(Copy, Drop)]
    pub struct Contracts {
        pub marketplace: IMarketplaceDispatcher,
        pub erc20: IERC20Dispatcher,
        pub erc721: IERC721Dispatcher,
        pub erc1155: IERC1155Dispatcher,
    }

    #[derive(Copy, Drop)]
    pub struct Context {
        pub owner: starknet::ContractAddress,
        pub receiver: starknet::ContractAddress,
        pub spender: starknet::ContractAddress,
        pub holder: starknet::ContractAddress,
        pub creator: starknet::ContractAddress,
        pub client_receiver: starknet::ContractAddress,
    }

    /// Drop all events from the given contract address
    pub fn clear_events(address: ContractAddress) {
        loop {
            match starknet::testing::pop_log_raw(address) {
                core::option::Option::Some(_) => {},
                core::option::Option::None => { break; },
            };
        }
    }

    #[inline]
    fn setup_namespace() -> NamespaceDef {
        NamespaceDef {
            namespace: "MARKETPLACE",
            resources: [
                TestResource::Model(models::m_Access::TEST_CLASS_HASH),
                TestResource::Model(models::m_Book::TEST_CLASS_HASH),
                TestResource::Model(models::m_Order::TEST_CLASS_HASH),
                TestResource::Model(models::m_MetadataAttribute::TEST_CLASS_HASH),
                TestResource::Event(events::e_Listing::TEST_CLASS_HASH),
                TestResource::Event(events::e_Sale::TEST_CLASS_HASH),
                TestResource::Event(events::e_Offer::TEST_CLASS_HASH),
                TestResource::Contract(Marketplace::TEST_CLASS_HASH),
            ]
                .span(),
        }
    }

    fn setup_contracts(receiver: ContractAddress) -> Span<ContractDef> {
        [
            ContractDefTrait::new(@"MARKETPLACE", @"Marketplace")
                .with_writer_of([dojo::utils::bytearray_hash(@"MARKETPLACE")].span())
                .with_init_calldata(array![0x1, 0x1F4, receiver.into(), OWNER().into()].span()),
        ]
            .span()
    }

    fn setup_account(public_key: felt252) -> ContractAddress {
        let (account_address, _) = deploy_syscall(
            class_hash: Account::TEST_CLASS_HASH.try_into().unwrap(),
            contract_address_salt: public_key,
            calldata: [public_key].span(),
            deploy_from_zero: false,
        )
            .unwrap_syscall();
        account_address
    }

    fn setup_erc20(recipient: ContractAddress) -> IERC20Dispatcher {
        let (erc20_address, _) = deploy_syscall(
            class_hash: ERC20::TEST_CLASS_HASH.try_into().unwrap(),
            contract_address_salt: 'ERC20',
            calldata: [recipient.into()].span(),
            deploy_from_zero: false,
        )
            .unwrap_syscall();
        IERC20Dispatcher { contract_address: erc20_address }
    }

    fn setup_erc721(recipient: ContractAddress, creator: ContractAddress) -> IERC721Dispatcher {
        let (erc721_address, _) = deploy_syscall(
            class_hash: ERC721::TEST_CLASS_HASH.try_into().unwrap(),
            contract_address_salt: 'ERC721',
            calldata: [recipient.into(), creator.into()].span(),
            deploy_from_zero: false,
        )
            .unwrap_syscall();
        IERC721Dispatcher { contract_address: erc721_address }
    }

    fn setup_erc1155(recipient: ContractAddress, creator: ContractAddress) -> IERC1155Dispatcher {
        let (erc1155_address, _) = deploy_syscall(
            class_hash: ERC1155::TEST_CLASS_HASH.try_into().unwrap(),
            contract_address_salt: 'ERC1155',
            calldata: [recipient.into(), creator.into()].span(),
            deploy_from_zero: false,
        )
            .unwrap_syscall();
        IERC1155Dispatcher { contract_address: erc1155_address }
    }

    #[inline]
    pub fn spawn() -> (WorldStorage, Contracts, Context) {
        // [Setup] World
        let namespace_def = setup_namespace();
        let world = spawn_test_world([namespace_def].span());
        // [Setup] Context
        let context = Context {
            owner: setup_account(OWNER().into()),
            receiver: setup_account(RECEIVER().into()),
            spender: setup_account(SPENDER().into()),
            holder: setup_account(HOLDER().into()),
            creator: setup_account(CREATOR().into()),
            client_receiver: setup_account(CLIENT_RECEIVER().into()),
        };
        world.sync_perms_and_inits(setup_contracts(context.receiver));
        // [Setup] Systems
        let (marketplace_address, _) = world.dns(@"Marketplace").unwrap();
        let systems = Contracts {
            marketplace: IMarketplaceDispatcher { contract_address: marketplace_address },
            erc20: setup_erc20(context.spender),
            erc721: setup_erc721(context.holder, context.creator),
            erc1155: setup_erc1155(context.holder, context.creator),
        };

        // [Return]
        (world, systems, context)
    }
}

#[test]
fn test_setup() {
    // [Setup] World
    setup::spawn();
}
