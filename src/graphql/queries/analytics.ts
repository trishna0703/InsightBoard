import { gql } from "@apollo/client";

export const LIST_ALL_INSIGHTS = gql`
  query ListAllInsights($cursor: Cursor, $filter: InsightsFilter) {
    insightsCollection(
      first: 30
      after: $cursor
      filter: $filter
      orderBy: [{ createdAt: AscNullsLast }]
    ) {
      edges {
        node {
          id
          title
          stage
          priority
          createdAt
          updatedAt
          drugName
          hcp {
            id
            name
          }
          category {
            id
            name
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

export const GET_KPI_COUNTS = gql`
  query GetKpiCounts(
    $startDate: Datetime
    $endDate: Datetime
    $prevStartDate: Datetime
    $prevEndDate: Datetime
  ) {
    total: insightsCollection(
      filter: { createdAt: { gte: $startDate, lte: $endDate } }
    ) {
      totalCount
    }
    prevTotal: insightsCollection(
      filter: { createdAt: { gte: $prevStartDate, lte: $prevEndDate } }
    ) {
      totalCount
    }
    observation: insightsCollection(
      filter: {
        stage: { eq: "observation" }
        createdAt: { gte: $startDate, lte: $endDate }
      }
    ) {
      totalCount
    }
    insight: insightsCollection(
      filter: {
        stage: { eq: "insight" }
        createdAt: { gte: $startDate, lte: $endDate }
      }
    ) {
      totalCount
    }
    actionable: insightsCollection(
      filter: {
        stage: { eq: "actionable" }
        createdAt: { gte: $startDate, lte: $endDate }
      }
    ) {
      totalCount
    }
    impact: insightsCollection(
      filter: {
        stage: { eq: "impact" }
        createdAt: { gte: $startDate, lte: $endDate }
      }
    ) {
      totalCount
    }
  }
`;
