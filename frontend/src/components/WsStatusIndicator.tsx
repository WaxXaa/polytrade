import { useAgent } from '../context/AgentContext.js';
import { Badge } from './components/ui/badge.js';

export function WsStatusIndicator() {
  const { wsStatus } = useAgent();

  return (
    <Badge
      variant={wsStatus === 'connected' ? 'default' : wsStatus === 'connecting' ? 'secondary' : 'destructive'}
      className="gap-1.5"
    >
      <span
        className={`size-1.5 rounded-full ${
          wsStatus === 'connected' ? 'bg-green-400' :
          wsStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
          'bg-red-400'
        }`}
      />
      {wsStatus === 'connected' ? 'Live' : wsStatus === 'connecting' ? 'Connecting' : 'Disconnected'}
    </Badge>
  );
}
