import { gql } from "@apollo/client";

// Slim mutation used only for stage moves (useMoveInsight) — keep the
// returned payload small so optimistic updates stay fast.
export const UPDATE_INSIGHT = gql`
  mutation UpdateInsight(
    $filter: InsightsFilter!
    $set: InsightsUpdateInput!
  ) {
    updateInsightsCollection(filter: $filter, set: $set) {
      affectedCount
      records {
        nodeId
        id
        title
        stage
        priority
        columnOrder
        updatedAt
      }
    }
  }
`;

// Full-field mutation used by the edit form — returns everything needed
// to update both the card list and the open detail panel.
export const UPDATE_INSIGHT_FIELDS = gql`
  mutation UpdateInsightFields(
    $filter: InsightsFilter!
    $set: InsightsUpdateInput!
  ) {
    updateInsightsCollection(filter: $filter, set: $set) {
      affectedCount
      records {
        nodeId
        id
        title
        description
        stage
        priority
        columnOrder
        drugName
        updatedAt
        hcp {
          nodeId
          id
          name
          specialty
          institution
        }
        category {
          nodeId
          id
          name
          color
        }
        insightTagsCollection {
          edges {
            node {
              tag {
                id
                name
              }
            }
          }
        }
      }
    }
  }
`;

export const CREATE_INSIGHT = gql`
  mutation CreateInsight($objects: [InsightsInsertInput!]!) {
    insertIntoInsightsCollection(objects: $objects) {
      affectedCount
      records {
        nodeId
        id
        title
        description
        stage
        priority
        columnOrder
        drugName
        createdAt
        updatedAt
        hcp {
          nodeId
          id
          name
          specialty
          institution
        }
        category {
          nodeId
          id
          name
          color
        }
        insightTagsCollection {
          edges {
            node {
              tag {
                id
                name
              }
            }
          }
        }
      }
    }
  }
`;
