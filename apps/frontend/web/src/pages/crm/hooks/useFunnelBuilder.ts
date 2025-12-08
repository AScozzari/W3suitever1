import { useState, useCallback, useEffect } from 'react';

export type BuilderMode = 'create' | 'edit';

export interface FunnelPipeline {
  pipelineId: string;
  pipelineName: string;
  stageOrder: number;
  stagesCount: number;
  color?: string;
}

export interface FunnelBuilderState {
  mode: BuilderMode;
  funnelId: string | null;
  funnelName: string;
  description: string;
  color: string;
  aiEnabled: boolean;
  estimatedDuration: number;
  pipelines: FunnelPipeline[];
  isDirty: boolean;
  originalSnapshot: string | null;
}

const initialState: FunnelBuilderState = {
  mode: 'create',
  funnelId: null,
  funnelName: '',
  description: '',
  color: '#FF6900',
  aiEnabled: false,
  estimatedDuration: 30,
  pipelines: [],
  isDirty: false,
  originalSnapshot: null,
};

export function useFunnelBuilder() {
  const [state, setState] = useState<FunnelBuilderState>(initialState);

  const createSnapshot = useCallback((builderState: FunnelBuilderState) => {
    return JSON.stringify({
      funnelName: builderState.funnelName,
      description: builderState.description,
      color: builderState.color,
      aiEnabled: builderState.aiEnabled,
      estimatedDuration: builderState.estimatedDuration,
      pipelines: builderState.pipelines,
    });
  }, []);

  const checkDirty = useCallback((currentState: FunnelBuilderState) => {
    if (!currentState.originalSnapshot) return false;
    const currentSnapshot = createSnapshot(currentState);
    return currentSnapshot !== currentState.originalSnapshot;
  }, [createSnapshot]);

  const startCreate = useCallback(() => {
    const newState = { ...initialState, mode: 'create' as BuilderMode };
    const snapshot = createSnapshot(newState);
    setState({ ...newState, originalSnapshot: snapshot });
  }, [createSnapshot]);

  const loadFunnel = useCallback((funnel: {
    id: string;
    name: string;
    description?: string;
    color: string;
    aiEnabled: boolean;
    estimatedDuration: number;
    pipelines: FunnelPipeline[];
  }) => {
    const newState: FunnelBuilderState = {
      mode: 'edit',
      funnelId: funnel.id,
      funnelName: funnel.name,
      description: funnel.description || '',
      color: funnel.color,
      aiEnabled: funnel.aiEnabled,
      estimatedDuration: funnel.estimatedDuration,
      pipelines: [...funnel.pipelines],
      isDirty: false,
      originalSnapshot: null,
    };
    const snapshot = createSnapshot(newState);
    setState({ ...newState, originalSnapshot: snapshot });
  }, [createSnapshot]);

  const updateMetadata = useCallback((updates: Partial<Pick<FunnelBuilderState, 'funnelName' | 'description' | 'color' | 'aiEnabled' | 'estimatedDuration'>>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      return { ...newState, isDirty: checkDirty(newState) };
    });
  }, [checkDirty]);

  const addPipeline = useCallback((pipeline: FunnelPipeline) => {
    setState(prev => {
      const newPipelines = [...prev.pipelines, { ...pipeline, stageOrder: prev.pipelines.length }];
      const newState = { ...prev, pipelines: newPipelines };
      return { ...newState, isDirty: checkDirty(newState) };
    });
  }, [checkDirty]);

  const removePipeline = useCallback((pipelineId: string) => {
    setState(prev => {
      const newPipelines = prev.pipelines
        .filter(p => p.pipelineId !== pipelineId)
        .map((p, index) => ({ ...p, stageOrder: index }));
      const newState = { ...prev, pipelines: newPipelines };
      return { ...newState, isDirty: checkDirty(newState) };
    });
  }, [checkDirty]);

  const reorderPipelines = useCallback((reorderedPipelines: FunnelPipeline[]) => {
    setState(prev => {
      const newPipelines = reorderedPipelines.map((p, index) => ({ ...p, stageOrder: index }));
      const newState = { ...prev, pipelines: newPipelines };
      return { ...newState, isDirty: checkDirty(newState) };
    });
  }, [checkDirty]);

  const reset = useCallback(() => {
    if (!state.originalSnapshot) {
      startCreate();
      return;
    }
    const original = JSON.parse(state.originalSnapshot);
    setState(prev => ({
      ...prev,
      ...original,
      isDirty: false,
    }));
  }, [state.originalSnapshot, startCreate]);

  const clearDirty = useCallback(() => {
    setState(prev => {
      const snapshot = createSnapshot(prev);
      return { ...prev, isDirty: false, originalSnapshot: snapshot };
    });
  }, [createSnapshot]);

  return {
    state,
    startCreate,
    loadFunnel,
    updateMetadata,
    addPipeline,
    removePipeline,
    reorderPipelines,
    reset,
    clearDirty,
  };
}
