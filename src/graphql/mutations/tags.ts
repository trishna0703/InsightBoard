import { gql } from "@apollo/client";

export const INSERT_INSIGHT_TAGS = gql`
  mutation InsertInsightTags($objects: [InsightTagsInsertInput!]!) {
    insertIntoInsightTagsCollection(objects: $objects) {
      affectedCount
    }
  }
`;

export const DELETE_INSIGHT_TAGS = gql`
  mutation DeleteInsightTags($insightId: UUID!) {
    deleteFromInsightTagsCollection(
      filter: { insightId: { eq: $insightId } }
    ) {
      affectedCount
    }
  }
`;
