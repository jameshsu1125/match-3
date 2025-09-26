import { memo, useEffect, useRef, useState } from 'react';
import { HomeContext, HomeState, THomeState } from './config';
import './index.less';
import Match3Game from './Match3Game';

const Home = memo(() => {
  const [state, setState] = useState<THomeState>(HomeState);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    new Match3Game('viewport');
  }, []);

  return (
    <div className='Home'>
      <HomeContext.Provider value={[state, setState]}>
        <div className='h-[480px] w-[640px] rounded bg-white shadow-md'>
          <canvas
            ref={canvasRef}
            id='viewport'
            className='h-full w-full'
            width={640}
            height={480}
          />
        </div>
      </HomeContext.Provider>
    </div>
  );
});

export default Home;
