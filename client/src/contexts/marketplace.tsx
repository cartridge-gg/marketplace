import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  MarketplaceProvider as ExternalProvider,
  Marketplace,
  MarketplaceModel,
  AccessModel,
  BookModel,
  OrderModel,
  ListingEvent,
  OfferEvent,
  SaleEvent,
  MarketplaceOptions,
} from "@cartridge/marketplace-sdk";
import {
  constants,
} from "starknet";

const CHAIN_ID = constants.StarknetChainId.SN_MAIN;

export interface ProjectProps {
  namespace: string;
  project: string;
}

/**
 * Interface defining the shape of the Marketplace context.
 */
interface MarketplaceContextType {
  /** The Marketplace client instance */
  chainId: string;
  provider: ExternalProvider;
  accesses: AccessModel[];
  books: BookModel[];
  orders: OrderModel[];
  listings: ListingEvent[];
  offers: OfferEvent[];
  sales: SaleEvent[];
}

/**
 * React context for sharing Marketplace-related data throughout the application.
 */
export const MarketplaceContext = createContext<MarketplaceContextType | null>(null);

/**
 * Provider component that makes Marketplace context available to child components.
 *
 * @param props.children - Child components that will have access to the Marketplace context
 * @throws {Error} If MarketplaceProvider is used more than once in the component tree
 */
export const MarketplaceProvider = ({ children }: { children: ReactNode }) => {
  const currentValue = useContext(MarketplaceContext);
  const [accesses, setAccesses] = useState<{ [accessId: string]: AccessModel }>({});
  const [books, setBooks] = useState<{ [bookId: string]: BookModel }>({});
  const [orders, setOrders] = useState<{ [orderId: string]: OrderModel }>({});
  const [listings, setListings] = useState<{ [listingId: string]: ListingEvent }>({});
  const [offers, setOffers] = useState<{ [offerId: string]: OfferEvent }>({});
  const [sales, setSales] = useState<{ [saleId: string]: SaleEvent }>({});
  const [initialized, setInitialized] = useState<boolean>(false);

  if (currentValue) {
    throw new Error("MarketplaceProvider can only be used once");
  }

  const provider = useMemo(
    // TODO: Update here to select either Mainnet or Sepolia
    () => new ExternalProvider(CHAIN_ID),
    [],
  );

  const handleMarketplaceModels = useCallback((models: MarketplaceModel[]) => {
    console.log(models)
    models.forEach(async (model: MarketplaceModel) => {
      if (AccessModel.isType(model as AccessModel)) {
        const access = model as AccessModel;
        if (!access.exists()) {
          setAccesses((prevs) => {
            const news = { ...prevs };
            delete news[access.identifier];
            return news;
          });
          return;
        }
        setAccesses((prevs) => ({ ...prevs, [access.identifier]: access }));
      } else if (BookModel.isType(model as BookModel)) {
        const book = model as BookModel;
        if (!book.exists()) {
          setBooks((prevs) => {
            const news = { ...prevs };
            delete news[book.identifier];
            return news;
          });
          return;
        }
        setBooks((prevs) => ({ ...prevs, [book.identifier]: book }));
      } else if (OrderModel.isType(model as OrderModel)) {
        const order = model as OrderModel;
        if (!order.exists()) {
          setOrders((prevs) => {
            const news = { ...prevs };
            delete news[order.identifier];
            return news;
          });
          return;
        }
        setOrders((prevs) => ({ ...prevs, [order.identifier]: order }));
      } else if (ListingEvent.isType(model as ListingEvent)) {
        const event = model as ListingEvent;
        if (!event.exists()) {
          setListings((prevs) => {
            const news = { ...prevs };
            delete news[event.identifier];
            return news;
          });
          return;
        }
        setListings((prevs) => ({ ...prevs, [event.identifier]: event }));
      } else if (OfferEvent.isType(model as OfferEvent)) {
        const event = model as OfferEvent;
        if (!event.exists()) {
          setOffers((prevs) => {
            const news = { ...prevs };
            delete news[event.identifier];
            return news;
          });
          return;
        }
        setOffers((prevs) => ({ ...prevs, [event.identifier]: event }));
      } else if (SaleEvent.isType(model as SaleEvent)) {
        const event = model as SaleEvent;
        if (!event.exists()) {
          setSales((prevs) => {
            const news = { ...prevs };
            delete news[event.identifier];
            return news;
          });
          return;
        }
        setSales((prevs) => ({ ...prevs, [event.identifier]: event }));
      }
    });
  }, []);

  useEffect(() => {
    if (initialized) return;
    const initialize = async () => {
      await Marketplace.init(CHAIN_ID);
      setInitialized(true);
    };
    initialize();
  }, [initialized, setInitialized]);

  useEffect(() => {
    if (!initialized) return;
    const options: MarketplaceOptions = {
      access: true,
      book: true,
      order: true,
      listing: true,
      offer: true,
      sale: true,
    };
    Marketplace.fetch(handleMarketplaceModels, options);
    Marketplace.sub(handleMarketplaceModels, options);
    return () => {
      Marketplace.unsub();
    };
  }, [initialized, handleMarketplaceModels]);

  return (
    <MarketplaceContext.Provider
      value={{
        chainId: CHAIN_ID,
        provider,
        accesses: Object.values(accesses),
        books: Object.values(books),
        orders: Object.values(orders),
        listings: Object.values(listings),
        offers: Object.values(offers),
        sales: Object.values(sales),
      }}
    >
      {children}
    </MarketplaceContext.Provider>
  );
};
