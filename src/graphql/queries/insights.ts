import { gql } from "@apollo/client";

export const GET_INSIGHT_DETAIL = gql`
  query GetInsightDetail($id: UUID!) {
    insightsCollection(filter: { id: { eq: $id } }, first: 1) {
      edges {
        node {
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
          insightActivitiesCollection(
            first: 5
            orderBy: [{ createdAt: DescNullsLast }]
          ) {
            edges {
              node {
                id
                action
                fieldName
                oldValue
                newValue
                createdAt
                user {
                  fullName
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const LIST_INSIGHTS = gql`
  query ListInsights($filter: InsightsFilter, $cursor: Cursor) {
    insightsCollection(
      first: 30
      after: $cursor
      filter: $filter
      orderBy: [{ columnOrder: AscNullsLast }]
    ) {
      edges {
        node {
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
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const GET_STAGE_COUNTS = gql`
  query GetStageCounts {
    observation: insightsCollection(
      filter: { stage: { eq: "observation" } }
    ) {
      totalCount
    }
    insight: insightsCollection(
      filter: { stage: { eq: "insight" } }
    ) {
      totalCount
    }
    actionable: insightsCollection(
      filter: { stage: { eq: "actionable" } }
    ) {
      totalCount
    }
    impact: insightsCollection(
      filter: { stage: { eq: "impact" } }
    ) {
      totalCount
    }
  }
`;

export const GET_KANBAN_OVERVIEW = gql`
  query GetKanbanOverview {
    observation: insightsCollection(
      filter: { stage: { eq: "observation" } }
      first: 4
      orderBy: [{ columnOrder: AscNullsLast }]
    ) {
      totalCount
      edges { node { id title priority } }
    }
    insight: insightsCollection(
      filter: { stage: { eq: "insight" } }
      first: 4
      orderBy: [{ columnOrder: AscNullsLast }]
    ) {
      totalCount
      edges { node { id title priority } }
    }
    actionable: insightsCollection(
      filter: { stage: { eq: "actionable" } }
      first: 4
      orderBy: [{ columnOrder: AscNullsLast }]
    ) {
      totalCount
      edges { node { id title priority } }
    }
    impact: insightsCollection(
      filter: { stage: { eq: "impact" } }
      first: 4
      orderBy: [{ columnOrder: AscNullsLast }]
    ) {
      totalCount
      edges { node { id title priority } }
    }
  }
`;

export const GET_USER_NAME = gql`
  query GetUserName($id: UUID!) {
    usersCollection(filter: { id: { eq: $id } }) {
      edges {
        node {
          id
          fullName
        }
      }
    }
  }
`;