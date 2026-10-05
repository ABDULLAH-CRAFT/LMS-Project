import { api } from '../axios';
import type {
  CreateEngagementWeightsPayload,
  EngagementPeriodRow,
  EngagementRun,
  EngagementWeightConfig,
} from '../../types/engagementScores';

export async function getEngagementPeriods(): Promise<EngagementPeriodRow[]> {
  const { data } = await api.get<EngagementPeriodRow[]>('/admin/engagement/scores/periods');
  return data;
}

export async function getLatestEngagementRun(periodId: string): Promise<EngagementRun> {
  const { data } = await api.get<EngagementRun>(`/admin/engagement/scores/periods/${periodId}/latest`);
  return data;
}

export async function calculateEngagementPeriod(periodId: string): Promise<EngagementRun> {
  const { data } = await api.post<EngagementRun>(`/admin/engagement/scores/periods/${periodId}/calculate`);
  return data;
}

export async function getEngagementWeights(): Promise<EngagementWeightConfig[]> {
  const { data } = await api.get<EngagementWeightConfig[]>('/admin/engagement/weights');
  return data;
}

export async function createEngagementWeights(payload: CreateEngagementWeightsPayload): Promise<EngagementWeightConfig> {
  const { data } = await api.post<EngagementWeightConfig>('/admin/engagement/weights', payload);
  return data;
}