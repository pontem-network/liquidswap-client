import { defineConfig } from 'orval';

export default defineConfig({
  liquidswap: {
    input: {
      target: 'https://api.liquidswap.com/-json',
      validation: false,
      filters: {
        tags: ['Pools', 'Coins'], 
      },
    },
    output: {
      target: 'src/api/liquidswap/generated/api.ts',
      schemas: 'src/api/liquidswap/generated/model',
      client: 'react-query',
      httpClient: 'axios',
      override: {
        mutator: {
          path: 'src/api/mutator.ts',
          name: 'customInstance',
        },
        query: {
          useQuery: true,
          useInfinite: false,
          useMutation: true,
          signal: true,
        },
      },
    },
  },
});
