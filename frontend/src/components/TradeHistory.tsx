import { useAgent } from '../context/AgentContext.js';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card.js';
import { Badge } from './components/ui/badge.js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './components/ui/table.js';

export function TradeHistory() {
  const { tradeHistory } = useAgent();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trade History</CardTitle>
      </CardHeader>
      <CardContent>
        {tradeHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No trades yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Market</TableHead>
                <TableHead>Dir</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Trader</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tradeHistory.map((trade) => (
                <TableRow key={trade.id}>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {new Date(trade.timestamp).toLocaleTimeString()}
                  </TableCell>
                  <TableCell className="max-w-[120px] truncate text-sm">
                    {trade.market}
                  </TableCell>
                  <TableCell>
                    <Badge variant={trade.direction === 'BUY' ? 'default' : 'destructive'}>
                      {trade.direction}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {trade.amount.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground truncate max-w-[80px]">
                    {trade.topTraderName}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        trade.status === 'SUCCESS' ? 'default' :
                        trade.status === 'FAILED' ? 'destructive' : 'secondary'
                      }
                    >
                      {trade.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
