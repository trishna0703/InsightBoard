import { gql } from "@apollo/client";

export const LIST_TAGS = gql`
  query ListTags {
    tagsCollection(orderBy: [{ name: AscNullsLast }]) {
      edges {
        node {
          id
          name
        }
      }
    }
  }
`;

export const LIST_CATEGORIES = gql`
  query ListCategories {
    categoriesCollection(orderBy: [{ name: AscNullsLast }]) {
      edges {
        node {
          id
          name
          color
        }
      }
    }
  }
`;
