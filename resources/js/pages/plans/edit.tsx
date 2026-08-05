import React from 'react';
import PlanForm from './form';

interface Plan {
  id: number;
  name: string;
  price: number;
  yearly_price: number | null;
  duration: string;
  description: string | null;
  business: number;
  max_stores: number;
  max_users_per_store: number;
  max_products_per_store: number;
  max_warehouses: number;
  storage_limit: number;
  domain_type: string;
  support_hours: number;
  support_type: string;
  enable_custdomain: string;
  enable_custsubdomain: string;
  pwa_business: string;
  enable_chatgpt: string;
  enable_shipping_method: string;
  enable_mobile_app: string;
  themes: string[] | null;
  is_trial: string | null;
  trial_day: number;
  is_plan_enable: string;
  is_default: boolean;
  is_recommended: boolean;
}

interface Props {
  plan: Plan;
  otherDefaultPlanExists: boolean;
}

export default function EditPlan({ plan, otherDefaultPlanExists }: Props) {
  return <PlanForm plan={plan} otherDefaultPlanExists={otherDefaultPlanExists} />;
}