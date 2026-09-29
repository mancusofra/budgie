import journal from './meta/_journal.json';
import m0000 from './0000_init.sql';
import m0001 from './0001_budget_months.sql';
import m0002 from './0002_budget_months_data.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002
    }
  }
  