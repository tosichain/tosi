import "@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract Timelock is Initializable, TimelockControllerUpgradeable {
  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    //_disableInitializers();
  }

  function initialize(
    uint256 minDelay,
    address[] memory proposers,
    address[] memory executors,
    address admin
  ) public initializer {
    __TimelockController_init(minDelay, proposers, executors, admin);
  }
}
