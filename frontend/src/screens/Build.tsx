import { NavLink } from 'react-router-dom';
export function BuildNav() {
  return <div className="seg subnav"><NavLink to="/loads">Loads</NavLink><NavLink to="/components">Components</NavLink><NavLink to="/brass">Brass & stock</NavLink><NavLink to="/rifles">Rifles</NavLink></div>;
}
