// FSM Test Component - Verify State Machine Transitions
import { useTimeAttendanceFSM } from '@/hooks/useTimeAttendanceFSM';
import { TimeAttendanceState } from '@/types/timeAttendanceFSM';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function FSMTest() {
  const fsm = useTimeAttendanceFSM('test-user-id', 'test-tenant-id');

  const testStore = {
    id: 'test-store-1',
    name: 'Test Store',
    latitude: 45.4642,
    longitude: 9.1900,
    distance: 50,
    inGeofence: true,
    confidence: 95,
    radius: 100,
    rank: 1,
    isNearest: true
  };

  const testClockInData = {
    storeId: 'test-store-1',
    trackingMethod: 'app' as const,
    geoLocation: {
      lat: 45.4642,
      lng: 9.1900,
      accuracy: 10
    }
  };

  // Test state transitions
  const handleTest = async () => {
    console.log('🔄 Starting FSM Test Sequence');
    
    // Test 1: idle → clockingIn → active
    console.log('Test 1: Select Method');
    fsm.selectMethod('app');
    
    console.log('Test 2: Select Store');
    fsm.selectStore(testStore);
    
    console.log('Test 3: Clock In Attempt');
    try {
      await fsm.clockIn(testClockInData);
      console.log('✅ Clock In Success');
    } catch (error) {
      console.log('❌ Clock In Failed:', error);
    }
    
    // Test 4: active → onBreak → active (if clocked in)
    if (fsm.isActive) {
      console.log('Test 4: Start Break');
      try {
        await fsm.startBreak();
        console.log('✅ Break Started');
        
        setTimeout(async () => {
          console.log('Test 5: End Break');
          await fsm.endBreak();
          console.log('✅ Break Ended');
        }, 2000);
      } catch (error) {
        console.log('❌ Break operations failed:', error);
      }
    }
  };

  const getStateColor = (state: TimeAttendanceState) => {
    switch (state) {
      case TimeAttendanceState.IDLE: return 'bg-gray-100 text-gray-800';
      case TimeAttendanceState.CLOCKING_IN: return 'bg-yellow-100 text-yellow-800';
      case TimeAttendanceState.ACTIVE: return 'bg-green-100 text-green-800';
      case TimeAttendanceState.ON_BREAK: return 'bg-blue-100 text-blue-800';
      case TimeAttendanceState.CLOCKING_OUT: return 'bg-orange-100 text-orange-800';
      case TimeAttendanceState.ERROR: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">FSM Test Dashboard</h2>
      
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Current State</h3>
        <div className="space-y-2">
          <Badge className={getStateColor(fsm.state)}>{fsm.state}</Badge>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>States:</strong>
              <ul className="ml-4">
                <li>Idle: {fsm.isIdle ? '✅' : '❌'}</li>
                <li>Clocking In: {fsm.isClockingIn ? '✅' : '❌'}</li>
                <li>Active: {fsm.isActive ? '✅' : '❌'}</li>
                <li>On Break: {fsm.isOnBreak ? '✅' : '❌'}</li>
                <li>Clocking Out: {fsm.isClockingOut ? '✅' : '❌'}</li>
                <li>Error: {fsm.isError ? '✅' : '❌'}</li>
              </ul>
            </div>
            
            <div>
              <strong>Capabilities:</strong>
              <ul className="ml-4">
                <li>Can Clock In: {fsm.canClockIn ? '✅' : '❌'}</li>
                <li>Can Clock Out: {fsm.canClockOut ? '✅' : '❌'}</li>
                <li>Can Start Break: {fsm.canStartBreak ? '✅' : '❌'}</li>
                <li>Can End Break: {fsm.canEndBreak ? '✅' : '❌'}</li>
                <li>Needs Break: {fsm.needsBreak ? '✅' : '❌'}</li>
                <li>Is Overtime: {fsm.isOvertime ? '✅' : '❌'}</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Context Data</h3>
        <div className="text-sm space-y-1">
          <div>Session ID: {fsm.context.sessionId || 'None'}</div>
          <div>Selected Method: {fsm.context.selectedMethod || 'None'}</div>
          <div>Selected Store: {fsm.context.selectedStore?.name || 'None'}</div>
          <div>Elapsed Time: {fsm.elapsedTime.hours}h {fsm.elapsedTime.minutes}m {fsm.elapsedTime.seconds}s</div>
          <div>Break Time: {fsm.breakTime.hours}h {fsm.breakTime.minutes}m {fsm.breakTime.seconds}s</div>
          <div>Error: {fsm.error || 'None'}</div>
          <div>Loading: {fsm.isLoading ? `Yes (${fsm.loadingAction})` : 'No'}</div>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Test Controls</h3>
        <div className="space-x-2">
          <Button onClick={handleTest} disabled={fsm.isLoading}>
            Run Full Test Sequence
          </Button>
          
          <Button 
            onClick={() => fsm.selectMethod('gps')} 
            disabled={fsm.isLoading}
            variant="outline"
          >
            Select GPS Method
          </Button>
          
          <Button 
            onClick={() => fsm.selectStore(testStore)} 
            disabled={fsm.isLoading}
            variant="outline"
          >
            Select Test Store
          </Button>
          
          <Button 
            onClick={() => fsm.clockIn(testClockInData)} 
            disabled={!fsm.canClockIn || fsm.isLoading}
            variant="outline"
          >
            Manual Clock In
          </Button>
          
          <Button 
            onClick={() => fsm.startBreak()} 
            disabled={!fsm.canStartBreak || fsm.isLoading}
            variant="outline"
          >
            Start Break
          </Button>
          
          <Button 
            onClick={() => fsm.endBreak()} 
            disabled={!fsm.canEndBreak || fsm.isLoading}
            variant="outline"
          >
            End Break
          </Button>
          
          <Button 
            onClick={() => fsm.clockOut()} 
            disabled={!fsm.canClockOut || fsm.isLoading}
            variant="outline"
          >
            Clock Out
          </Button>
          
          <Button 
            onClick={fsm.reset} 
            disabled={fsm.isLoading}
            variant="destructive"
          >
            Reset FSM
          </Button>
          
          {fsm.error && (
            <Button 
              onClick={fsm.clearError} 
              disabled={fsm.isLoading}
              variant="secondary"
            >
              Clear Error
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}