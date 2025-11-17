import { DeployStatusMatrix } from '../deploy/DeployStatusMatrix';

export default function StatusRealTimeTab() {
  return (
    <div style={{ padding: '0 2rem 2rem' }}>
      <DeployStatusMatrix />
    </div>
  );
}
