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

export function OpenPositions() {
  const { openPositions } = useAgent();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Open Positions</CardTitle>
      </CardHeader>
      <CardContent>
        {openPositions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No open positions.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Market</TableHead>
                <TableHead>Dir</TableHead>
                <TableHead className="text-right">Entry</TableHead>
                <TableHead className="text-right">Stop-Loss</TableHead>
                <TableHead className="text-right">Size</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {openPositions.map((pos) => (
                <TableRow key={pos.id}>
                  <TableCell className="max-w-[140px] truncate font-medium text-sm">
                    {pos.market}
                  </TableCell>
                  <TableCell>
                    <Badge variant={pos.direction === 'BUY' ? 'default' : 'destructive'}>
                      {pos.direction}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {pos.entryPrice.toFixed(4)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-red-500">
                    {pos.stopLossLevel.toFixed(4)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {pos.size.toFixed(2)}
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
