import { createFileRoute } from '@tanstack/react-router';
import { useCollections } from '../hooks';
import { CollectibleAsset } from '@cartridge/ui';
import { Token } from "@dojoengine/torii-client";
import { useMemo } from 'react';
import { getChecksumAddress } from 'starknet';

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  const { collections } = useCollections();

  return (
    <div className="bg-background-100 h-screen w-full overflow-y-scroll">
      {Object.keys(collections).map((project) => (
        <Project key={project} project={project} tokens={collections[project] || []} />
      ))}
    </div>
  )
}

function Project({ tokens }: { project: string, tokens: Token[] }) {
  const collections = useMemo(() => {
    const results: { [key: string]: Token[] } = {};
    tokens.forEach((token) => {
      const contract = getChecksumAddress(token.contract_address);
      if (contract) {
        if (!results[contract]) {
          results[contract] = [];
        }
        results[contract].push(token);
      }
    });
    return results;
  }, [tokens]);
  return (
    <div className="grid grid-cols-3 gap-4 place-items-center select-none">
      {Object.keys(collections).map((contract) => (
        <Collection key={contract} collection={collections[contract]} />
      ))}
    </div>
  )
}

function Collection({ collection }: { collection: Token[] }) {
  const metadata = useMemo(() => {
    if (!collection || collection.length === 0) return null;
    const metadata = collection[0].metadata;
    try {
      return JSON.parse(metadata);
    } catch(error) {
      console.error("Error parsing metadata:", error);
      return null;
    }
  }, [collection]);

  return (
    <div className="w-full group select-none">
      <CollectibleAsset
        title={metadata.name}
        image={metadata.image.replace("ipfs://", "https://ipfs.io/ipfs/")}
        count={collection.length}
        onClick={() => console.log("click")}
        className="cursor-pointer"
      />
    </div>
  )
}
