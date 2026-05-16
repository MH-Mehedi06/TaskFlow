import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ICategory } from '../../types';

interface TaskWizardState {
  step: number;
  categoryId: string;
  subCategoryId: string;
  category: ICategory | null;
  title: string;
  description: string;
  notes: string;
  photos: string[];
  address: string;
  location: { lat: number; lng: number } | null;
  scheduledAt: string;
  estimatedHours: number;
  price: number;
  aiSuggestion: {
    title?: string;
    estimatedHours?: number;
    checklist?: string[];
    complexityLevel?: string;
  } | null;
}

const initialState: TaskWizardState = {
  step: 1,
  categoryId: '',
  subCategoryId: '',
  category: null,
  title: '',
  description: '',
  notes: '',
  photos: [],
  address: '',
  location: null,
  scheduledAt: '',
  estimatedHours: 1,
  price: 0,
  aiSuggestion: null,
};

const taskSlice = createSlice({
  name: 'taskWizard',
  initialState,
  reducers: {
    setStep: (state, action: PayloadAction<number>) => { state.step = action.payload; },
    setCategory: (state, action: PayloadAction<{ categoryId: string; category: ICategory }>) => {
      state.categoryId = action.payload.categoryId;
      state.category = action.payload.category;
    },
    setSubCategory: (state, action: PayloadAction<string>) => { state.subCategoryId = action.payload; },
    setTaskDetails: (state, action: PayloadAction<Partial<TaskWizardState>>) => {
      return { ...state, ...action.payload };
    },
    setAiSuggestion: (state, action: PayloadAction<TaskWizardState['aiSuggestion']>) => { state.aiSuggestion = action.payload; },
    resetWizard: () => initialState,
  },
});

export const { setStep, setCategory, setSubCategory, setTaskDetails, setAiSuggestion, resetWizard } = taskSlice.actions;
export default taskSlice.reducer;
