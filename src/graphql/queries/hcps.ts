import { gql } from "@apollo/client";

export const LIST_HCPS = gql`
  query ListHCPs($search: String) {
    hcpsCollection(
      filter: { name: { ilike: $search } }
      first: 10
      orderBy: [{ name: AscNullsLast }]
    ) {
      edges {
        node {
          nodeId
          id
          name
          specialty
          institution
        }
      }
    }
  }
`;
