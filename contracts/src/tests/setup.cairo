pub mod setup {
    // Starknet imports

    use starknet::ContractAddress;
    use starknet::testing::set_contract_address;

    // Dojo imports

    use dojo::world::{WorldStorage, WorldStorageTrait};
    use dojo_cairo_test::{
        spawn_test_world, NamespaceDef, ContractDef, TestResource, ContractDefTrait,
        WorldStorageTestTrait,
    };

    // External imports

    use orderbook::models::{index as orderbook_models};
    use orderbook::events::{index as orderbook_events};

    // Internal imports

    use marketplace::constants::NAMESPACE;
    use marketplace::systems::marketplace::{Marketplace, IMarketplaceDispatcher};

    // Constant

    fn OWNER() -> ContractAddress {
        starknet::contract_address_const::<'OWNER'>()
    }

    fn PLAYER() -> ContractAddress {
        starknet::contract_address_const::<'PLAYER'>()
    }

    #[derive(Copy, Drop)]
    pub struct Systems {
        pub marketplace: IMarketplaceDispatcher,
    }

    #[derive(Copy, Drop)]
    pub struct Context {
        pub player_id: felt252,
    }

    #[inline]
    fn setup_namespace() -> NamespaceDef {
        NamespaceDef {
            namespace: NAMESPACE(),
            resources: [
                TestResource::Model(orderbook_models::m_Book::TEST_CLASS_HASH),
                TestResource::Model(orderbook_models::m_Order::TEST_CLASS_HASH),
                TestResource::Event(orderbook_events::e_Listing::TEST_CLASS_HASH),
                TestResource::Event(orderbook_events::e_Offer::TEST_CLASS_HASH),
                TestResource::Event(orderbook_events::e_Sale::TEST_CLASS_HASH),
                TestResource::Contract(Marketplace::TEST_CLASS_HASH),
            ]
                .span(),
        }
    }

    fn setup_contracts() -> Span<ContractDef> {
        [
            ContractDefTrait::new(@NAMESPACE(), @"Marketplace")
                .with_writer_of([dojo::utils::bytearray_hash(@NAMESPACE())].span())
                .with_init_calldata(array![OWNER().into()].span()),
        ]
            .span()
    }

    #[inline]
    pub fn spawn() -> (WorldStorage, Systems, Context) {
        // [Setup] World
        set_contract_address(OWNER());
        let namespace_def = setup_namespace();
        let world = spawn_test_world([namespace_def].span());
        world.sync_perms_and_inits(setup_contracts());
        // [Setup] Systems
        let (marketplace_address, _) = world.dns(@"Marketplace").unwrap();
        let systems = Systems {
            marketplace: IMarketplaceDispatcher { contract_address: marketplace_address },
        };

        // [Setup] Context
        let context = Context { player_id: PLAYER().into() };

        // [Return]
        (world, systems, context)
    }
}
