import { gql } from "@apollo/client";

export const CREATE_INSIGHT_ACTIVITY = gql`
  mutation CreateInsightActivity(
    $objects: [InsightActivitiesInsertInput!]!
  ) {
    insertIntoInsightActivitiesCollection(objects: $objects) {
      affectedCount
      records {
        id
        createdAt
      }
    }
  }
`;
